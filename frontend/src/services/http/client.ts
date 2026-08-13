import { createLogger } from '@/lib/logger';
import type { ApiResponse, HttpMethod, HttpTransport, QueryValue, RequestConfig } from '@/types';

import { createAxiosTransport } from './axiosTransport';

const log = createLogger('http');

/**
 * True when the app should talk to the mock backend.
 *
 * Vite substitutes `import.meta.env.VITE_API_MODE` with a literal at build time,
 * so this folds to a constant and the guarded dynamic import in the bootstrap
 * disappears entirely from a live build. Nothing in this module imports
 * `src/mocks`, which is what makes that possible.
 */
export const isMockMode = (): boolean => import.meta.env.VITE_API_MODE !== 'live';

type Params = Readonly<Record<string, QueryValue | readonly QueryValue[]>>;

interface CallOptions {
  readonly params?: Params;
  readonly signal?: AbortSignal;
  readonly file?: File;
}

const resolveTransport = (): HttpTransport => {
  if (isMockMode()) {
    // Fail fast rather than falling back to a live call against nothing. In
    // mock mode the bootstrap installs the transport before the app renders;
    // reaching here means that ordering broke.
    throw new Error(
      'Mock mode is active but no transport was installed. ' +
        'Call installMockTransport() before issuing requests.',
    );
  }

  const baseURL = import.meta.env.VITE_API_BASE_URL;
  if (!baseURL) {
    // Fail fast: a live build with no base URL is a misconfiguration, not a
    // situation to silently paper over.
    throw new Error('VITE_API_MODE=live requires VITE_API_BASE_URL to be set');
  }

  log.info('using live transport', { baseURL });
  return createAxiosTransport(baseURL);
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
