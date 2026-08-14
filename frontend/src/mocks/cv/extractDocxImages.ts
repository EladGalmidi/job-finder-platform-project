import { createLogger } from '@/lib/logger';

const log = createLogger('cvDocxImages');

/** Picture formats Word embeds that a browser can decode. */
const DECODABLE = /\.(png|jpe?g|gif|bmp|webp)$/i;

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
};

/**
 * How many pictures are worth pulling out. A CV that stores its text as images
 * runs to a couple of hundred fragments; far past that and the file is a photo
 * album, not a document.
 */
const MAX_IMAGES = 400;

/**
 * Pulls a .docx's embedded pictures out in reading order.
 *
 * This exists for documents that contain no text at all — every line stored as
 * a picture of itself. Word files produced by converting a PDF, or exported by
 * design tools, do this routinely: the file opens and looks perfectly normal,
 * and holds not one readable character.
 *
 * Order comes from `r:embed` references in document.xml rather than the media
 * folder's filenames, because the folder is not in document order. Each id is
 * resolved through the relationships part to a file in the archive.
 */
export const extractDocxImages = async (file: File): Promise<Blob[]> => {
  const { unzipSync } = await import('fflate');

  const zip = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const decoder = new TextDecoder();

  const documentXml = zip['word/document.xml'];
  const relsXml = zip['word/_rels/document.xml.rels'];

  if (documentXml === undefined || relsXml === undefined) {
    log.warn('archive has no document part to read pictures from');
    return [];
  }

  const targets = new Map(
    [...decoder.decode(relsXml).matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g)].map(
      (match) => [match[1] ?? '', match[2] ?? ''] as const,
    ),
  );

  const blobs: Blob[] = [];

  for (const match of decoder.decode(documentXml).matchAll(/r:embed="(rId\d+)"/g)) {
    if (blobs.length >= MAX_IMAGES) break;

    const target = targets.get(match[1] ?? '');
    if (target === undefined || !DECODABLE.test(target)) continue;

    // Targets are relative to the word/ folder, and may be written with a
    // leading path segment that has to be stripped before lookup.
    const path = `word/${target.replace(/^\.?\//, '')}`;
    const bytes = zip[path];
    if (bytes === undefined) continue;

    const extension = target.split('.').pop()?.toLowerCase() ?? '';
    blobs.push(new Blob([bytes], { type: MIME[extension] ?? 'image/png' }));
  }

  log.debug('read docx pictures', { count: blobs.length });

  return blobs;
};
