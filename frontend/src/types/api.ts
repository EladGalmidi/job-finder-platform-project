/**
 * Transport-level contract. Both AxiosTransport and MockTransport satisfy this,
 * which is what makes `VITE_API_MODE` a one-line switch rather than a rewrite.
 */

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestConfig {
  readonly method: HttpMethod;
  readonly url: string;
  readonly params?: Readonly<Record<string, QueryValue | readonly QueryValue[]>>;
  readonly body?: unknown;
  readonly signal?: AbortSignal;
  /** Set for endpoints that accept file uploads; the mock reads metadata only. */
  readonly file?: File;
}

export interface ApiResponse<T> {
  readonly data: T;
  readonly status: number;
}

export interface HttpTransport {
  request<T>(config: RequestConfig): Promise<ApiResponse<T>>;
}

export type ApiErrorCode =
  /** No or expired session on a protected endpoint. */
  | 'UNAUTHORIZED'
  /** Credentials supplied but rejected. Distinct copy from UNAUTHORIZED. */
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'UNKNOWN';

/**
 * Every failure that reaches the UI is one of these. Callers branch on `code`;
 * `message` is for logs and last-resort display, never for control flow.
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
}

/** Plain shape stored in Redux — `Error` instances are not serialisable. */
export interface SerializedApiError {
  readonly code: ApiErrorCode;
  readonly message: string;
  readonly status: number;
  readonly details?: Readonly<Record<string, string>>;
}

export const serializeApiError = (error: ApiError): SerializedApiError =>
  error.details === undefined
    ? { code: error.code, message: error.message, status: error.status }
    : { code: error.code, message: error.message, status: error.status, details: error.details };

export const isApiError = (value: unknown): value is ApiError => value instanceof ApiError;

export interface Paginated<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly hasMore: boolean;
}

/** Status of any async unit of work held in a slice. */
export type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';
