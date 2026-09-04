import { createCanvas, loadImage, type Canvas } from '@napi-rs/canvas';
import { unzipSync } from 'fflate';

/**
 * Reading text that is stored as pictures.
 *
 * Some CVs contain no text at all. A file converted from PDF to Word, or
 * exported by a design tool, stores every line as an image of itself: it opens
 * and looks perfectly normal, and holds not one readable character. OCR is the
 * only way to read those, and it is why this runs on the server rather than in
 * the browser — the model is large and the work is slow.
 */

/** Height each fragment is scaled to. Tesseract wants roughly 30px of cap height. */
const TARGET_LINE_HEIGHT = 32;
const LINE_GAP = 10;

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;

const MAX_SHEET_HEIGHT = 16_000;
const MAX_SHEET_WIDTH = 2_000;

/** Below this a fragment is a bullet, rule or icon — never a word. */
const MIN_FRAGMENT_WIDTH = 10;
const MIN_FRAGMENT_HEIGHT = 8;

/** Rendering scale for PDF pages. Below roughly 2x, small print stops resolving. */
const PDF_RENDER_SCALE = 2;

/** OCR is slow. Past this a CV is not a CV, and the wait stops being reasonable. */
const PAGE_LIMIT = 5;

/** Pictures worth pulling from a Word file before it is a photo album. */
const MAX_IMAGES = 400;

const IMAGE_PART = /^word\/media\/.+\.(png|jpe?g|gif|bmp|webp)$/i;

/**
 * Runs work against a Tesseract worker and always shuts it down.
 *
 * English only: every extra language is another model to download, and CVs in
 * this market are overwhelmingly written in English even when the candidate is
 * not. A Hebrew-language scan comes back poorly, which the caller reports
 * rather than papers over.
 */
const withWorker = async <T>(
  work: (recognize: (image: Buffer) => Promise<string>) => Promise<T>,
): Promise<T> => {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');

  try {
    return await work(async (image) => (await worker.recognize(image)).data.text);
  } finally {
    await worker.terminate();
  }
};

/**
 * Lays image fragments out as one tall sheet for a single OCR pass.
 *
 * A Word file stores its text one picture per line in places, per word or even
 * per letter in others. Recognising each on its own goes badly — a 13x19 crop
 * holding two characters gives Tesseract nothing to work with, and a hundred
 * separate calls are slow. Stacking them lets the page segmenter do what it is
 * built for. A word alone on its own line still matches a skill perfectly well:
 * the layout is already lost in a document like this, and the words are what we
 * need.
 */
const composeSheet = async (images: readonly Uint8Array[]): Promise<Canvas | undefined> => {
  const placed: { image: Awaited<ReturnType<typeof loadImage>>; width: number; height: number }[] =
    [];

  for (const bytes of images) {
    try {
      const image = await loadImage(Buffer.from(bytes));
      if (image.width < MIN_FRAGMENT_WIDTH || image.height < MIN_FRAGMENT_HEIGHT) continue;

      const scale = Math.min(
        Math.max(TARGET_LINE_HEIGHT / image.height, MIN_SCALE),
        MAX_SCALE,
        MAX_SHEET_WIDTH / image.width,
      );

      placed.push({
        image,
        width: Math.ceil(image.width * scale),
        height: Math.ceil(image.height * scale),
      });
    } catch {
      // One unreadable picture must not lose the rest of the document.
    }
  }

  const rows: typeof placed = [];
  let height = 0;

  for (const item of placed) {
    if (height + item.height + LINE_GAP > MAX_SHEET_HEIGHT) break;
    height += item.height + LINE_GAP;
    rows.push(item);
  }

  if (rows.length === 0) return undefined;

  const canvas = createCanvas(Math.max(...rows.map((row) => row.width)), height);
  const context = canvas.getContext('2d');

  // These are usually transparent PNGs of dark text. On the default
  // transparent ground they recognise as nothing at all.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  let offset = 0;
  for (const row of rows) {
    context.drawImage(row.image, 0, offset, row.width, row.height);
    offset += row.height + LINE_GAP;
  }

  return canvas;
};

export interface OcrResult {
  readonly text: string;
  /** How many pictures were fed in, so a failure can describe the file. */
  readonly images: number;
}

/** Reads a Word file whose text is stored as pictures. */
export const ocrDocx = async (bytes: Buffer): Promise<OcrResult> => {
  const zip = unzipSync(new Uint8Array(bytes));

  /*
   * Order comes from the document's own references, not the media folder's
   * filenames, which are not in reading order.
   */
  const documentXml = zip['word/document.xml'];
  const relsXml = zip['word/_rels/document.xml.rels'];
  const decoder = new TextDecoder();

  const images: Uint8Array[] = [];

  if (documentXml !== undefined && relsXml !== undefined) {
    const targets = new Map(
      [...decoder.decode(relsXml).matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g)].map(
        (match) => [match[1] ?? '', match[2] ?? ''] as const,
      ),
    );

    for (const match of decoder.decode(documentXml).matchAll(/r:embed="(rId\d+)"/g)) {
      if (images.length >= MAX_IMAGES) break;
      const target = targets.get(match[1] ?? '');
      if (target === undefined) continue;

      const part = zip[`word/${target.replace(/^\.?\//, '')}`];
      if (part !== undefined && IMAGE_PART.test(`word/${target}`)) images.push(part);
    }
  }

  // Fall back to whatever is in the media folder if the references could not be
  // resolved: jumbled order still detects skills, and nothing is worse.
  if (images.length === 0) {
    for (const [name, part] of Object.entries(zip)) {
      if (IMAGE_PART.test(name)) images.push(part);
    }
    // Trimmed after collecting rather than inside the loop: the compiler has
    // already narrowed the length to zero here, so a break on it reads as dead.
    images.splice(MAX_IMAGES);
  }

  if (images.length === 0) return { text: '', images: 0 };

  const sheet = await composeSheet(images);
  if (sheet === undefined) return { text: '', images: images.length };

  const text = await withWorker((recognize) => recognize(sheet.toBuffer('image/png')));

  return { text, images: images.length };
};

/** Reads a PDF with no text layer by rendering each page and recognising it. */
export const ocrPdf = async (bytes: Buffer): Promise<OcrResult> => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useWorkerFetch: false,
  }).promise;

  const pageCount = Math.min(doc.numPages, PAGE_LIMIT);
  const pages: string[] = [];

  try {
    await withWorker(async (recognize) => {
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        const page = await doc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });

        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const context = canvas.getContext('2d');

        // White ground first: a PDF page has no background of its own, and dark
        // text on transparent recognises as nothing.
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        /*
         * `canvas`, not `canvasContext`. pdfjs takes one or the other and
         * supplying both is the documented invalid combination — it leaves the
         * render promise unsettled forever.
         *
         * @napi-rs/canvas implements the drawing surface pdfjs needs, and its
         * types line up well enough that no cast is required.
         */
        await page.render({ canvas, viewport }).promise;

        pages.push(await recognize(canvas.toBuffer('image/png')));
      }
    });
  } finally {
    await doc.cleanup();
  }

  return { text: pages.join('\n'), images: pageCount };
};
