import { createLogger } from '@/lib/logger';
import { cvApi } from '@/services/api/cvApi';
import type { CvId } from '@/types';

const log = createLogger('cvExport');

/** Hands a blob to the browser as a download. */
const saveBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

/** Strips the original extension so the JSON does not end up `cv.pdf.json`. */
const jsonNameFor = (fileName: string): string =>
  `${fileName.replace(/\.[^.]+$/, '') || 'cv'}.json`;

/**
 * Fetches a CV's JSON document and saves it.
 *
 * Takes the id rather than a CV record so it can run the moment an analysis
 * finishes, when the caller knows which CV was analysed but the store may still
 * hold the previous one. Returns success instead of throwing — every caller
 * wants to show a message either way, and none of them can do anything else
 * about a failure.
 */
export const exportCvDocument = async (cvId: CvId, fileName: string): Promise<boolean> => {
  try {
    const document_ = await cvApi.document(cvId);
    saveBlob(
      new Blob([JSON.stringify(document_, null, 2)], { type: 'application/json' }),
      jsonNameFor(fileName),
    );
    return true;
  } catch (error) {
    log.error('json export failed', { cvId, error: String(error) });
    return false;
  }
};
