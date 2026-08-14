import { createLogger } from '@/lib/logger';

const log = createLogger('cvExtract');

/**
 * Pulls the plain text out of an uploaded CV.
 *
 * This lives in the mock layer because it is the stand-in backend's job, not
 * the UI's. A real deployment does this server-side — the browser should not be
 * the place a CV gets parsed, and the result has to be identical for every
 * client. Nothing outside `src/mocks` imports it, so when the real endpoint
 * lands this whole directory is deleted and no UI code changes.
 *
 * Both parsers are loaded on demand: they are large, they are only needed the
 * moment someone actually uploads a file, and keeping them behind a dynamic
 * import stops them from weighing down the initial payload.
 */
export const extractText = async (file: File): Promise<string> => {
  const name = file.name.toLowerCase();

  try {
    if (name.endsWith('.pdf')) return await extractPdf(file);
    if (name.endsWith('.docx')) return await extractDocx(file);

    // .doc is the legacy binary format; it is not readable without a much
    // heavier converter, so it is reported as empty rather than half-parsed.
    log.warn('unsupported format for text extraction', { name: file.name });
    return '';
  } catch (error) {
    log.error('extraction failed', { name: file.name, error: String(error) });
    return '';
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
    pages.push(
      content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' '),
    );
  }

  await doc.cleanup();
  return pages.join('\n');
};

const extractDocx = async (file: File): Promise<string> => {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
};
