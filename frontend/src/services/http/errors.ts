import axios from 'axios';

import { ApiError, type ApiErrorCode } from '@/types';

const STATUS_TO_CODE: Readonly<Record<number, ApiErrorCode>> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'FILE_TOO_LARGE',
  415: 'UNSUPPORTED_FILE_TYPE',
  422: 'VALIDATION_FAILED',
  429: 'RATE_LIMITED',
};

interface ServerErrorBody {
  readonly code?: string;
  readonly message?: string;
  readonly details?: Record<string, string>;
}

const isServerErrorBody = (value: unknown): value is ServerErrorBody =>
  typeof value === 'object' && value !== null;

const codeForStatus = (status: number): ApiErrorCode => {
  const mapped = STATUS_TO_CODE[status];
  if (mapped !== undefined) return mapped;
  return status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN';
};

/**
 * Collapses anything thrown by the transport into a single structured type.
 *
 * Callers branch on `error.code`; nothing in the app parses error messages.
 */
export const normalizeError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;

  if (axios.isCancel(error)) {
    return new ApiError('CANCELLED', 'Request was cancelled', 0);
  }

  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError('TIMEOUT', 'The request timed out', 0);
    }

    const { response } = error;
    if (response === undefined) {
      return new ApiError('NETWORK_ERROR', 'Could not reach the server', 0);
    }

    const body: unknown = response.data;
    const serverBody = isServerErrorBody(body) ? body : {};

    return new ApiError(
      typeof serverBody.code === 'string'
        ? (serverBody.code as ApiErrorCode)
        : codeForStatus(response.status),
      serverBody.message ?? error.message,
      response.status,
      serverBody.details,
    );
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError('CANCELLED', 'Request was cancelled', 0);
  }

  return new ApiError('UNKNOWN', error instanceof Error ? error.message : 'Unexpected error', 0);
};
