import { createLogger } from '@/lib/logger';

const log = createLogger('cvExtract');

/** Rendering scale for OCR. Below roughly 2x, small print stops resolving. */
const OCR_SCALE = 2;

/** OCR is slow. Past this a CV is not a CV, and the wait stops being reasonable. */
const OCR_PAGE_LIMIT = 5;

/**
 * How long OCR gets before it is abandoned.
 *
 * It has to download a recognition model on first use and then work through
 * full-page bitmaps, so it is slow by nature. What it must never be is
 * open-ended: a spinner that never resolves is worse for the user than the
 * plain message saying the file cannot be read.
 */
const OCR_TIMEOUT_MS = 60_000;

const withTimeout = async <T,>(work: Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${String(ms)}ms`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
};

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
  /** Text was read, from the text layer or by OCR. */
  | 'ok'
  /** Nothing readable, by any method. */
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
  /** True when the characters came from OCR rather than a text layer. */
  readonly usedOcr: boolean;
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
 * Three passes, cheapest first, because they fail for different reasons:
 *
 * 1. The text layer. Instant, exact, and covers anything from a word processor.
 * 2. The text layer again including marked content — some generators wrap every
 *    run in it, and the default pass skips those entirely.
 * 3. OCR. The only thing that reads a CV exported as images, which is what
 *    design tools, CV builders and scanners produce. It costs a one-off model
 *    download and a few seconds a page, so it is never attempted while a text
 *    layer is available.
 *
 * This lives in the mock layer because it is the stand-in backend's job. A real
 * deployment does all of it server-side, where OCR is neither slow nor a
 * download the user pays for.
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
      const docx = await extractDocx(file);
      const trimmed = docx.text.trim();

      // Diagnostics are reported for Word files too. Without them the caller
      // fell back to zeroes and told the reader their Word document was a
      // scanned PDF — a message about a format they had not used.
      const diagnostics: ExtractionDiagnostics = {
        pages: 0,
        rawItems: trimmed === '' ? 0 : 1,
        textItems: trimmed === '' ? 0 : 1,
        characters: trimmed.length,
        usedOcr: false,
      };

      if (trimmed === '') {
        log.warn('docx contained no text', { name: file.name, notes: docx.notes });
        return { text: '', outcome: 'empty', diagnostics, detail: docx.notes.join('; ') };
      }

      log.debug('extracted CV text', { name: file.name, ...diagnostics });
      return { text: docx.text, outcome: 'ok', diagnostics };
    }

    let result = await extractPdfText(file, false);

    if (result.diagnostics.characters === 0 && result.diagnostics.rawItems === 0) {
      log.warn('no text runs on first pass, retrying with marked content', { name: file.name });
      result = await extractPdfText(file, true);
    }

    if (result.diagnostics.characters === 0) {
      log.warn('no text layer, falling back to OCR', { name: file.name, ...result.diagnostics });

      const ocr = await withTimeout(
        extractPdfByOcr(file, result.diagnostics),
        OCR_TIMEOUT_MS,
        'OCR',
      ).catch((error: unknown) => {
        log.warn('OCR abandoned', { name: file.name, error: String(error) });
        return { text: '', diagnostics: { ...result.diagnostics, usedOcr: true } };
      });

      if (ocr.text.trim() !== '') {
        log.debug('OCR succeeded', { name: file.name, ...ocr.diagnostics });
        return { text: ocr.text, outcome: 'ok', diagnostics: ocr.diagnostics };
      }

      log.warn('OCR found nothing either', { name: file.name, ...ocr.diagnostics });
      return { text: '', outcome: 'empty', diagnostics: ocr.diagnostics };
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
      usedOcr: false,
    },
  };
};

/**
 * Reads a PDF with no text layer by rendering each page and running OCR.
 *
 * English only: every extra language is another model download, and CVs in this
 * market are overwhelmingly written in English even when the candidate is not.
 * A Hebrew-language scan will come back poorly, which the caller reports rather
 * than papers over.
 */
const extractPdfByOcr = async (
  file: File,
  previous: ExtractionDiagnostics,
): Promise<PdfExtraction> => {
  const doc = await loadPdf(file);
  const pageCount = Math.min(doc.numPages, OCR_PAGE_LIMIT);

  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');

  const pages: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: OCR_SCALE });

      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      // `canvas` alone. Passing canvasContext alongside it is the documented
      // invalid combination — pdfjs accepts one or the other, and supplying
      // both leaves the render promise unsettled forever.
      await page.render({ canvas, viewport }).promise;

      const { data } = await worker.recognize(canvas);
      pages.push(data.text);

      // Release the bitmap straight away; five full pages at 2x is a lot of
      // memory to hold at once.
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    await worker.terminate();
    await doc.cleanup();
  }

  const text = pages.join('\n');

  return {
    text,
    diagnostics: {
      pages: doc.numPages,
      rawItems: previous.rawItems,
      textItems: previous.textItems,
      characters: text.trim().length,
      usedOcr: true,
    },
  };
};

interface DocxExtraction {
  readonly text: string;
  /** mammoth's own warnings, kept for logs when a document yields nothing. */
  readonly notes: string[];
}

const extractDocx = async (file: File): Promise<DocxExtraction> => {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });

  return {
    text: result.value,
    notes: result.messages.map((message) => `${message.type}: ${message.message}`),
  };
};
