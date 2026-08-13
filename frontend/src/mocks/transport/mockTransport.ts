import { createLogger } from '@/lib/logger';
import { STORAGE_KEYS, readString } from '@/lib/storage';
import { ApiError } from '@/types';
import type { ApiResponse, HttpTransport, RequestConfig } from '@/types';

import { mockDb } from '../db/mockDb';
import { routes } from '../handlers';

import { faults } from './faults';
import { delay } from './latency';
import { createQueryAccess, findRoute } from './router';

const log = createLogger('mockTransport');

/**
 * Resolves the caller from the stored token, mirroring what the axios request
 * interceptor sends as an Authorization header. Keeping both transports on the
 * same token source is what makes auth behave identically in either mode.
 */
const resolveUserId = (): string | null => {
  const token = readString(STORAGE_KEYS.authToken);
  if (token === null) return null;
  return mockDb.state.sessions[token] ?? null;
};

export const createMockTransport = (): HttpTransport => ({
  async request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    const matched = findRoute(routes, config.method, config.url);

    if (matched === null) {
      throw new ApiError(
        'NOT_FOUND',
        `No mock handler for ${config.method} ${config.url}`,
        404,
      );
    }

    await delay(matched.route.latency ?? 'normal', config.signal);

    // Injected faults fire after the delay so they exercise the same loading
    // path a real failure would.
    faults.check(config.url);

    const userId = resolveUserId();

    if (matched.route.auth === true && userId === null) {
      throw new ApiError('UNAUTHORIZED', 'Not signed in', 401);
    }

    const data = matched.route.handler({
      params: matched.params,
      query: createQueryAccess(config.params),
      body: config.body,
      file: config.file,
      userId,
      signal: config.signal,
    }) as T;

    log.debug('handled', { method: config.method, url: config.url });

    return { data, status: config.method === 'POST' ? 201 : 200 };
  },
});
