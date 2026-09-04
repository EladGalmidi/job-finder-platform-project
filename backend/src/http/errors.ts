/**
 * The error contract, copied deliberately from the frontend's
 * src/types/api.ts. The UI branches on `code` and never parses messages, so a
 * code this server invents that the frontend does not know falls through to its
 * UNKNOWN branch and the user sees nothing useful.
 *
 * Keep this union identical to the frontend's. When the shared contract package
 * is extracted, this is the first thing that moves into it.
 */
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'CV_NO_TEXT'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'UNKNOWN';

/**
 * The body shape the frontend's normalizeError reads. Anything else it treats
 * as a bare status code, losing the code and the field-level details.
 */
export interface ApiErrorBody {
  readonly code: ApiErrorCode;
  readonly message: string;
  readonly details?: Readonly<Record<string, string>>;
}

/**
 * A failure that is safe to show the caller.
 *
 * Anything thrown that is not an ApiError is a defect on our side and is
 * reported as SERVER_ERROR with its detail dropped, so an internal message
 * never leaks to a client.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: Readonly<Record<string, string>> | undefined;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    details?: Readonly<Record<string, string>>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  toBody(): ApiErrorBody {
    return this.details === undefined
      ? { code: this.code, message: this.message }
      : { code: this.code, message: this.message, details: this.details };
  }
}

export const unauthorized = (message = 'Authentication required'): ApiError =>
  new ApiError('UNAUTHORIZED', message, 401);

export const invalidCredentials = (): ApiError =>
  new ApiError('INVALID_CREDENTIALS', 'Email or password is incorrect', 401);

export const notFound = (what: string): ApiError =>
  new ApiError('NOT_FOUND', `${what} was not found`, 404);

export const conflict = (message: string): ApiError => new ApiError('CONFLICT', message, 409);

export const validationFailed = (details: Readonly<Record<string, string>>): ApiError =>
  new ApiError('VALIDATION_FAILED', 'The request was not valid', 422, details);
