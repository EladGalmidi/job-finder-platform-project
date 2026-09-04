import { extractDocxXml } from './extractDocxXml.js';
import { ocrDocx, ocrPdf } from './ocr.js';

/**
 * Pulls the plain text out of an uploaded CV.
 *
 * Ported from the frontend mock, where all of this ran in the browser. It
 * belongs here: the parsers are large, the work is slow, and a client-side
 * result is something the server would have to trust.
 *
 * Two passes, cheapest first, because they fail for different reasons:
 *
 * 1. The text layer. Instant, exact, and covers anything from a word processor.
 * 2. OCR. The only thing that reads a CV stored as pictures, which is what
 *    design tools, CV builders, scanners and PDF-to-Word converters produce.
 *    It costs seconds a page, so it is never attempted while text is available.
 */
export type ExtractionOutcome = 'ok' | 'empty' | 'unsupported' | 'failed';

export interface ExtractionDiagnostics {
  readonly pages: number;
  /** Text runs the parser found, whether or not they decoded to characters. */
  readonly rawItems: number;
  readonly textItems: number;
  readonly characters: number;
  readonly usedOcr: boolean;
  /** Pictures found in a file that held no text. The OCR path reads these. */
  readonly images?: number;
  readonly format: 'pdf' | 'docx';
}

export interface ExtractionResult {
  readonly text: string;
  readonly outcome: ExtractionOutcome;
  readonly detail?: string;
  readonly diagnostics?: ExtractionDiagnostics;
}

export const extractText = async (
  bytes: Buffer,
  fileName: string,
): Promise<ExtractionResult> => {
  const name = fileName.toLowerCase();
  const isPdf = name.endsWith('.pdf');
  const isDocx = name.endsWith('.docx');

  if (!isPdf && !isDocx) {
    // .doc is the legacy binary format and needs a far heavier converter, so it
    // is refused rather than half-parsed.
    return { text: '', outcome: 'unsupported' };
  }

  try {
    return isDocx ? await readDocx(bytes) : await readPdf(bytes);
  } catch (error) {
    return { text: '', outcome: 'failed', detail: String(error) };
  }
};

const readDocx = async (bytes: Buffer): Promise<ExtractionResult> => {
  const mammoth = await import('mammoth');

  /*
   * mammoth throws outright on an archive it does not recognise as Word.
   * Unguarded that abandons the whole extraction, including the raw XML reader
   * that exists precisely for documents it cannot handle.
   */
  let text = '';
  const notes: string[] = [];

  try {
    const result = await mammoth.extractRawText({ buffer: bytes });
    text = result.value;
    notes.push(...result.messages.map((message) => `${message.type}: ${message.message}`));
  } catch (error) {
    notes.push(`mammoth: ${String(error)}`);
  }

  /*
   * mammoth walks Word's document model, which omits text boxes and some
   * shapes. Designed CV templates lay whole pages out that way, so a document
   * plainly full of text can come back empty. Reading the XML directly picks up
   * everything the model skipped.
   */
  let images = 0;
  if (text.trim() === '') {
    const raw = extractDocxXml(bytes);
    images = raw.images;

    if (raw.text.trim() === '') {
      notes.push(`archive entries: ${raw.entries.slice(0, 12).join(', ')}`);
      notes.push(`pictures: ${String(raw.images)}`);
    } else {
      text = raw.text;
      notes.push('read from raw xml');
    }
  }

  /*
   * Still nothing, so the document holds no text in any form. Its words may
   * still be there as pictures — which is exactly what a Word file converted
   * from a PDF looks like.
   */
  let usedOcr = false;
  if (text.trim() === '') {
    const recognised = await ocrDocx(bytes);
    images = recognised.images;

    if (recognised.text.trim() === '') {
      notes.push(`OCR read nothing from ${String(recognised.images)} pictures`);
    } else {
      text = recognised.text;
      usedOcr = true;
    }
  }

  const trimmed = text.trim();

  const diagnostics: ExtractionDiagnostics = {
    pages: 0,
    rawItems: trimmed === '' ? 0 : 1,
    textItems: trimmed === '' ? 0 : 1,
    characters: trimmed.length,
    usedOcr,
    images,
    format: 'docx',
  };

  return trimmed === ''
    ? { text: '', outcome: 'empty', diagnostics, detail: notes.join('; ') }
    : { text, outcome: 'ok', diagnostics };
};

const readPdf = async (bytes: Buffer): Promise<ExtractionResult> => {
  // The legacy build is the one that runs outside a browser.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const doc = await pdfjs.getDocument({
    // Copied because pdfjs transfers the buffer and detaches it, which would
    // leave a retry reading an empty array and returning a confident wrong
    // answer.
    data: new Uint8Array(bytes),
    // No worker in Node: the main thread is where this already runs.
    useWorkerFetch: false,
  }).promise;

  const pages: string[] = [];
  let rawItems = 0;
  let textItems = 0;

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();

    const strings = content.items.map((item) => ('str' in item ? item.str : ''));

    // Counted apart on purpose. Runs that exist but decode to nothing mean a
    // font without a usable encoding — our problem. No runs at all means there
    // is genuinely no text on the page, and only OCR can help.
    rawItems += content.items.length;
    textItems += strings.filter((value) => value.trim() !== '').length;
    pages.push(strings.join(' '));
  }

  const layerText = pages.join('\n');
  const pageCount = doc.numPages;
  await doc.cleanup();

  const base = { pages: pageCount, rawItems, textItems, format: 'pdf' as const };

  if (layerText.trim() !== '') {
    return {
      text: layerText,
      outcome: 'ok',
      diagnostics: { ...base, characters: layerText.trim().length, usedOcr: false },
    };
  }

  /*
   * No text layer at all, so every page is a picture and rendering it is the
   * only way to read it. This is the case a scanner, a design tool or a CV
   * builder produces, and the one the browser version could never afford.
   */
  const recognised = await ocrPdf(bytes);
  const text = recognised.text;

  return text.trim() === ''
    ? {
        text: '',
        outcome: 'empty',
        diagnostics: { ...base, characters: 0, usedOcr: true, images: recognised.images },
      }
    : {
        text,
        outcome: 'ok',
        diagnostics: {
          ...base,
          characters: text.trim().length,
          usedOcr: true,
          images: recognised.images,
        },
      };
};
