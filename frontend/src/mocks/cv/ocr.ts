import { createLogger } from '@/lib/logger';

const log = createLogger('cvOcr');

/**
 * Height every fragment is scaled to before recognition.
 *
 * Tesseract wants roughly 30px of cap height. Much below that and it starts
 * inventing characters; much above and the sheet grows without reading any
 * better, and recognition cost is linear in area.
 */
const TARGET_LINE_HEIGHT = 32;

/** Blank rows between fragments, so the line finder keeps them apart. */
const LINE_GAP = 10;

/** Scale bounds. An 8px sliver blown up 20x is noise, not text. */
const MIN_SCALE = 0.5;
const MAX_SCALE = 4;

/** Canvas ceilings. Past these the browser starts refusing to allocate. */
const MAX_SHEET_HEIGHT = 16_000;
const MAX_SHEET_WIDTH = 2_000;

/** Below this a fragment is a bullet, rule or icon — never a word. */
const MIN_FRAGMENT_WIDTH = 10;
const MIN_FRAGMENT_HEIGHT = 8;

/**
 * Runs work against a Tesseract worker and always shuts it down.
 *
 * The worker downloads a recognition model on first use and holds it in memory,
 * so it is created once per extraction and handed to the caller rather than
 * spun up per image.
 *
 * English only: every extra language is another model download, and CVs in this
 * market are overwhelmingly written in English even when the candidate is not.
 */
export const withOcrWorker = async <T>(
  work: (recognize: (image: HTMLCanvasElement) => Promise<string>) => Promise<T>,
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
 * Some documents store their text as pictures — one per line in places, one per
 * word or even per letter in others. Recognising each fragment on its own goes
 * badly: a 13x19 crop holding two characters gives Tesseract nothing to work
 * with, and 150 separate calls are slow.
 *
 * Stacking them into one image instead lets the page segmenter do what it is
 * built for. Reading order across a fragment is preserved, and a word that ends
 * up alone on its own line still matches a skill perfectly well — the layout is
 * already lost in a document like this, and the words are what we need.
 */
export const composeFragments = async (blobs: Blob[]): Promise<HTMLCanvasElement | undefined> => {
  const bitmaps: ImageBitmap[] = [];

  for (const blob of blobs) {
    try {
      bitmaps.push(await createImageBitmap(blob));
    } catch (error) {
      // A single unreadable picture must not lose the rest of the document.
      log.warn('could not decode fragment', { error: String(error) });
    }
  }

  const placed = bitmaps
    .filter(
      (bitmap) => bitmap.width >= MIN_FRAGMENT_WIDTH && bitmap.height >= MIN_FRAGMENT_HEIGHT,
    )
    .map((bitmap) => {
      const scale = Math.min(
        Math.max(TARGET_LINE_HEIGHT / bitmap.height, MIN_SCALE),
        MAX_SCALE,
        MAX_SHEET_WIDTH / bitmap.width,
      );

      return {
        bitmap,
        width: Math.ceil(bitmap.width * scale),
        height: Math.ceil(bitmap.height * scale),
      };
    });

  const rows: typeof placed = [];
  let height = 0;

  for (const item of placed) {
    if (height + item.height + LINE_GAP > MAX_SHEET_HEIGHT) break;
    height += item.height + LINE_GAP;
    rows.push(item);
  }

  const skipped = bitmaps.length - rows.length;
  if (skipped > 0) log.debug('fragments left out of sheet', { skipped });

  if (rows.length === 0) {
    for (const bitmap of bitmaps) bitmap.close();
    return undefined;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(...rows.map((row) => row.width));
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (context === null) {
    for (const bitmap of bitmaps) bitmap.close();
    return undefined;
  }

  // These pictures are usually transparent PNGs of dark text. Left on the
  // default transparent-black ground they recognise as nothing at all.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  let offset = 0;
  for (const row of rows) {
    context.drawImage(row.bitmap, 0, offset, row.width, row.height);
    offset += row.height + LINE_GAP;
  }

  for (const bitmap of bitmaps) bitmap.close();

  log.debug('composed ocr sheet', {
    fragments: rows.length,
    width: canvas.width,
    height: canvas.height,
  });

  return canvas;
};
