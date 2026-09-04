import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

/**
 * Where uploads live in development.
 *
 * The local disk is a stand-in for object storage. Everything above this module
 * deals only in opaque keys, so replacing it with S3 or R2 is a change here and
 * nowhere else — no schema change, no route change.
 */
const ROOT = resolve(process.cwd(), 'uploads');

/**
 * Builds a storage key for an upload.
 *
 * The name is a UUID, never the user's filename. Two people uploading cv.pdf
 * must not collide, and a filename like `../../etc/passwd` must not be able to
 * decide where bytes land. The original name is kept in the database, where it
 * is data rather than a path.
 */
export const keyForUpload = (originalName: string): string => {
  const extension = /\.([a-z0-9]{1,8})$/i.exec(originalName)?.[1]?.toLowerCase() ?? 'bin';
  return `cv/${randomUUID()}.${extension}`;
};

const pathForKey = (key: string): string => {
  const full = resolve(ROOT, key);

  // Defence in depth: even though keys are generated, a path that escapes the
  // uploads directory is refused rather than trusted.
  if (!full.startsWith(ROOT)) throw new Error(`Refusing to resolve key outside storage: ${key}`);

  return full;
};

export const putFile = async (key: string, bytes: Buffer): Promise<void> => {
  const path = pathForKey(key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
};

export const getFile = async (key: string): Promise<Buffer> => readFile(pathForKey(key));

export const deleteFile = async (key: string): Promise<void> => {
  try {
    await unlink(pathForKey(key));
  } catch {
    // Already gone is the desired end state, not a failure.
  }
};

export const storageRoot = (): string => join(ROOT);
