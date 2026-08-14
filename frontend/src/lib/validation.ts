/**
 * Shared validation rules. The mock handlers and the forms both use these so a
 * field can never pass client-side and fail server-side for a different reason.
 */

export const MAX_CV_BYTES = 5 * 1024 * 1024;

/*
 * `.doc` is deliberately absent. The legacy binary format needs a converter far
 * heavier than anything here, so extraction rejects it — accepting it at the
 * gate only meant offering a file type in the picker that failed a step later,
 * with a message contradicting what the picker had just allowed.
 */
export const ACCEPTED_CV_MIME_TYPES: readonly string[] = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const ACCEPTED_CV_EXTENSIONS: readonly string[] = ['.pdf', '.docx'];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isValidEmail = (value: string): boolean => EMAIL_PATTERN.test(value.trim());

export const MIN_PASSWORD_LENGTH = 8;

export const isValidPassword = (value: string): boolean => value.length >= MIN_PASSWORD_LENGTH;

export const isValidFullName = (value: string): boolean => value.trim().length >= 2;

export type CvFileRejection = 'FILE_TOO_LARGE' | 'UNSUPPORTED_FILE_TYPE';

export interface CvFileCheck {
  readonly ok: boolean;
  readonly reason?: CvFileRejection;
}

const hasAcceptedExtension = (fileName: string): boolean =>
  ACCEPTED_CV_EXTENSIONS.some((extension) => fileName.toLowerCase().endsWith(extension));

/**
 * Checks extension *and* MIME type. Browsers report an empty or generic MIME
 * type often enough that extension alone is unreliable, and vice versa.
 */
export const checkCvFile = (file: { name: string; size: number; type: string }): CvFileCheck => {
  const typeOk =
    hasAcceptedExtension(file.name) ||
    ACCEPTED_CV_MIME_TYPES.includes(file.type);

  if (!typeOk) return { ok: false, reason: 'UNSUPPORTED_FILE_TYPE' };
  if (file.size > MAX_CV_BYTES) return { ok: false, reason: 'FILE_TOO_LARGE' };

  return { ok: true };
};
