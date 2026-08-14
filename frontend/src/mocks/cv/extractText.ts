import { createLogger } from '@/lib/logger';

const log = createLogger('cvExtract');

export type ExtractionOutcome =
  /** Text was read. */
  | 'ok'
  /** Parsed cleanly, but the document carries no text — typically a scan. */
  | 'empty'
  /** Format we cannot read at all, such as legacy binary .doc. */
  | 'unsupported'
  /** The parser itself failed. A defect on our side, not the user's file. */
  | 'failed';

export interface ExtractionResult {
  readonly text: string;
  readonly outcome: ExtractionOutcome;
  /** Parser error, kept for logs. Never shown to the user. */
  readonly detail?: string;
  /**
   * What the parser actually saw. "Nothing came out" is not diagnosable on its
   * own: pages with zero text items means an image or a scan, whereas text
   * items that yield no characters means the glyphs carry no Unicode mapping.
   * Those need different answers, so both are measured.
   */
  readonly diagnostics?: {
    readonly pages: number;
    readonly textItems: number;
    readonly characters: number;
  };
}

/**
 * Pulls the plain text out of an uploaded CV.
 *
 * This lives in the mock layer because it is the stand-in backend's job, not
 * the UI's. A real deployment does this server-side — the browser should not be
 * where a CV gets parsed, and the result has to be identical for every client.
 * Nothing outside `src/mocks` imports it, so when the real endpoint lands this
 * whole directory is deleted and no UI code changes.
 *
 * The outcome is reported rather than collapsed into an empty string. "This is a
 * scanned PDF" and "our parser broke" need different messages, and the caller
 * must never be able to mistake either for "this CV has no skills".
 *
 * Both parsers are loaded on demand: they are large, they are only needed the
 * moment someone actually uploads, and a dynamic import keeps them out of the
 * initial payload entirely.
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
    if (!isPdf) {
      const text = await extractDocx(file);
      const trimmed = text.trim();
      if (trimmed === '') {
        log.warn('docx contained no text', { name: file.name });
        return { text: '', outcome: 'empty' };
      }
      return { text, outcome: 'ok' };
    }

    let result = await extractPdf(file, false);

    // Some generators wrap every run in marked content, which the default pass
    // skips entirely. Retrying with it included costs one more parse and
    // recovers those files rather than calling them scans.
    if (result.text.trim() === '' && result.diagnostics.textItems === 0) {
      log.warn('no text on first pass, retrying with marked content', { name: file.name });
      result = await extractPdf(file, true);
    }

    const trimmed = result.text.trim();

    if (trimmed === '') {
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
  readonly diagnostics: { pages: number; textItems: number; characters: number };
}

const extractPdf = async (file: File, includeMarkedContent: boolean): Promise<PdfExtraction> => {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  // The buffer is re-read on every call because pdfjs transfers it to the
  // worker, which detaches it. Reusing one across the retry would hand the
  // second parse an empty buffer.
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;

  const pages: string[] = [];
  let textItems = 0;

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent({ includeMarkedContent });

    const strings = content.items.map((item) => ('str' in item ? item.str : ''));
    textItems += strings.filter((value) => value !== '').length;
    pages.push(strings.join(' '));
  }

  const text = pages.join('\n');
  await doc.cleanup();

  return {
    text,
    diagnostics: { pages: doc.numPages, textItems, characters: text.trim().length },
  };
};

const extractDocx = async (file: File): Promise<string> => {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
};
