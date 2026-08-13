import axios, { type AxiosInstance } from 'axios';

import { STORAGE_KEYS, readString } from '@/lib/storage';
import type { ApiResponse, HttpTransport, RequestConfig } from '@/types';

import { normalizeError } from './errors';

const REQUEST_TIMEOUT_MS = 20_000;

/**
 * The real transport. Never exercised while VITE_API_MODE=mock, but the request
 * shape it builds is identical to the one MockTransport answers — that is the
 * whole point of routing both through one interface.
 */
export const createAxiosTransport = (baseURL: string): HttpTransport => {
  const instance: AxiosInstance = axios.create({
    baseURL,
    timeout: REQUEST_TIMEOUT_MS,
    headers: { Accept: 'application/json' },
  });

  instance.interceptors.request.use((config) => {
    const token = readString(STORAGE_KEYS.authToken);
    if (token !== null) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return {
    async request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
      try {
        let data: unknown = config.body;

        if (config.file !== undefined) {
          const form = new FormData();
          form.append('file', config.file);
          if (config.body !== undefined) {
            form.append('payload', JSON.stringify(config.body));
          }
          data = form;
        }

        const response = await instance.request<T>({
          method: config.method,
          url: config.url,
          params: config.params,
          data,
          ...(config.signal === undefined ? {} : { signal: config.signal }),
        });

        return { data: response.data, status: response.status };
      } catch (error) {
        throw normalizeError(error);
      }
    },
  };
};
