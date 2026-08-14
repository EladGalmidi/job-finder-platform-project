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
    const text = isPdf ? await extractPdf(file) : await extractDocx(file);
    const trimmed = text.trim();

    if (trimmed === '') {
      log.warn('no text layer found', { name: file.name });
      return { text: '', outcome: 'empty' };
    }

    log.debug('extracted CV text', { name: file.name, characters: trimmed.length });
    return { text, outcome: 'ok' };
  } catch (error) {
    log.error('extraction failed', { name: file.name, error: String(error) });
    return { text: '', outcome: 'failed', detail: String(error) };
  }
};

const extractPdf = async (file: File): Promise<string> => {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;

  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
  }

  await doc.cleanup();
  return pages.join('\n');
};

const extractDocx = async (file: File): Promise<string> => {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
};
