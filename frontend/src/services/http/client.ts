import { createLogger } from '@/lib/logger';
import { createMockTransport } from '@/mocks/transport/mockTransport';
import type { ApiResponse, HttpMethod, HttpTransport, QueryValue, RequestConfig } from '@/types';

import { createAxiosTransport } from './axiosTransport';

const log = createLogger('http');

type Params = Readonly<Record<string, QueryValue | readonly QueryValue[]>>;

interface CallOptions {
  readonly params?: Params;
  readonly signal?: AbortSignal;
  readonly file?: File;
}

const resolveTransport = (): HttpTransport => {
  const mode = import.meta.env.VITE_API_MODE;

  if (mode === 'live') {
    const baseURL = import.meta.env.VITE_API_BASE_URL;
    if (!baseURL) {
      // Fail fast: a live build with no base URL is a misconfiguration, not a
      // situation to silently paper over with a mock.
      throw new Error('VITE_API_MODE=live requires VITE_API_BASE_URL to be set');
    }
    log.info('using live transport', { baseURL });
    return createAxiosTransport(baseURL);
  }

  log.info('using mock transport');
  return createMockTransport();
};

let transport: HttpTransport | null = null;

const getTransport = (): HttpTransport => {
  transport ??= resolveTransport();
  return transport;
};

/** Test seam: lets a test install a stub transport. */
export const __setTransport = (next: HttpTransport | null): void => {
  transport = next;
};

const build = (
  method: HttpMethod,
  url: string,
  body: unknown,
  options: CallOptions | undefined,
): RequestConfig => ({
  method,
  url,
  ...(body === undefined ? {} : { body }),
  ...(options?.params === undefined ? {} : { params: options.params }),
  ...(options?.signal === undefined ? {} : { signal: options.signal }),
  ...(options?.file === undefined ? {} : { file: options.file }),
});

const unwrap = async <T>(promise: Promise<ApiResponse<T>>): Promise<T> => (await promise).data;

/**
 * The only surface the service layer uses. Services below this line always
 * speak real URLs and real query params, in both mock and live mode.
 */
export const api = {
  get: <T>(url: string, options?: CallOptions): Promise<T> =>
    unwrap(getTransport().request<T>(build('GET', url, undefined, options))),

  post: <T>(url: string, body?: unknown, options?: CallOptions): Promise<T> =>
    unwrap(getTransport().request<T>(build('POST', url, body, options))),

  patch: <T>(url: string, body?: unknown, options?: CallOptions): Promise<T> =>
    unwrap(getTransport().request<T>(build('PATCH', url, body, options))),

  delete: <T>(url: string, options?: CallOptions): Promise<T> =>
    unwrap(getTransport().request<T>(build('DELETE', url, undefined, options))),
};
