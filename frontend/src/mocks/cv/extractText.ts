import { createLogger } from '@/lib/logger';

const log = createLogger('cvExtract');

/**
 * Where pdfjs looks for its character maps and standard font data. Copied into
 * the build by vite-plugin-static-copy; see vite.config.ts.
 */
const PDF_ASSETS = {
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/pdfjs/standard_fonts/',
} as const;

export type ExtractionOutcome =
  /** Text was read. */
  | 'ok'
  /** Parsed cleanly, but the document carries no text layer. */
  | 'empty'
  /** Format we cannot read at all, such as legacy binary .doc. */
  | 'unsupported'
  /** The parser itself failed. A defect on our side, not the user's file. */
  | 'failed';

export interface ExtractionDiagnostics {
  readonly pages: number;
  /** Text runs pdfjs found, whether or not they decoded to anything. */
  readonly rawItems: number;
  /** Runs that decoded to actual characters. */
  readonly textItems: number;
  readonly characters: number;
}

export interface ExtractionResult {
  readonly text: string;
  readonly outcome: ExtractionOutcome;
  /** Parser error, kept for logs. Never shown to the user. */
  readonly detail?: string;
  readonly diagnostics?: ExtractionDiagnostics;
}

/**
 * Pulls the plain text out of an uploaded CV.
 *
 * Two passes over the text layer: the default one, then again including marked
 * content, because some generators wrap every run in it and the default pass
 * skips those entirely.
 *
 * A PDF with no text layer at all — a scan, or a design tool exporting pages as
 * images — cannot be read this way and is reported as such. Recovering those
 * needs OCR, which belongs on a server: in the browser it means a multi-megabyte
 * model fetched at runtime and tens of seconds per upload, for a result worse
 * than asking for the .docx.
 *
 * This lives in the mock layer because it is the stand-in backend's job. A real
 * deployment does it server-side, where OCR is a reasonable thing to add.
 */
export const extractText = async (file: File): Promise<ExtractionResult> => {
  const name = file.name.toLowerCase();
  const isPdf = name.endsWith('.pdf');
  const isDocx = name.endsWith('.docx');

  if (!isPdf && !isDocx) {
    // .doc is the legacy binary format; reading it needs a much heavier
    // converter, so it is refused rather than half-parsed.
    log.warn('unsupported format for text extraction', { name: file.name });
    return { text: '', outcome: 'unsupported' };
  }

  try {
    if (isDocx) {
      const text = await extractDocx(file);
      return text.trim() === ''
        ? { text: '', outcome: 'empty' }
        : { text, outcome: 'ok' };
    }

    let result = await extractPdfText(file, false);

    if (result.diagnostics.characters === 0 && result.diagnostics.rawItems === 0) {
      log.warn('no text runs on first pass, retrying with marked content', { name: file.name });
      result = await extractPdfText(file, true);
    }

    if (result.diagnostics.characters === 0) {
      log.warn('no readable text in PDF', { name: file.name, ...result.diagnostics });
      return { text: '', outcome: 'empty', diagnostics: result.diagnostics };
    }

    log.debug('extracted CV text', { name: file.name, ...result.diagnostics });
    return { text: result.text, outcome: 'ok', diagnostics: result.diagnostics };
  } catch (error) {
    log.error('extraction failed', { name: file.name, error: String(error) });
    return { text: '', outcome: 'failed', detail: String(error) };
  }
};

interface PdfExtraction {
  readonly text: string;
  readonly diagnostics: ExtractionDiagnostics;
}

const loadPdf = async (file: File) => {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  // The buffer is re-read on every call because pdfjs transfers it to the
  // worker, which detaches it. Reusing one would hand the next pass an empty
  // buffer and produce a confident wrong answer.
  return pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    ...PDF_ASSETS,
  }).promise;
};

const extractPdfText = async (file: File, includeMarkedContent: boolean): Promise<PdfExtraction> => {
  const doc = await loadPdf(file);

  const pages: string[] = [];
  let rawItems = 0;
  let textItems = 0;

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent({ includeMarkedContent });

    const strings = content.items.map((item) => ('str' in item ? item.str : ''));

    // Counted apart on purpose. Runs that exist but decode to nothing mean a
    // font without a usable encoding — our problem. No runs at all means there
    // is genuinely no text on the page.
    rawItems += content.items.length;
    textItems += strings.filter((value) => value.trim() !== '').length;
    pages.push(strings.join(' '));
  }

  const text = pages.join('\n');
  await doc.cleanup();

  return {
    text,
    diagnostics: {
      pages: doc.numPages,
      rawItems,
      textItems,
      characters: text.trim().length,
    },
  };
};

const extractDocx = async (file: File): Promise<string> => {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
};
