import type { HttpMethod, QueryValue } from '@/types';

import type { LatencyProfile } from './latency';

export interface QueryAccess {
  string(key: string, fallback: string): string;
  optionalString(key: string): string | null;
  number(key: string): number | null;
  boolean(key: string): boolean;
  list(key: string): readonly string[];
}

export interface HandlerContext {
  readonly params: Readonly<Record<string, string>>;
  readonly query: QueryAccess;
  readonly body: unknown;
  readonly file: File | undefined;
  /** Resolved from the stored token; null for anonymous requests. */
  readonly userId: string | null;
  readonly signal: AbortSignal | undefined;
}

export interface MockRoute {
  readonly method: HttpMethod;
  /** Express-style pattern, e.g. `/jobs/:jobId`. */
  readonly pattern: string;
  readonly latency?: LatencyProfile;
  /** When true the handler is only reached with a valid session. */
  readonly auth?: boolean;
  readonly handler: (context: HandlerContext) => unknown;
}

interface MatchedRoute {
  readonly route: MockRoute;
  readonly params: Record<string, string>;
}

const splitPath = (path: string): readonly string[] =>
  path.split('/').filter((segment) => segment.length > 0);

const matchPattern = (pattern: string, path: string): Record<string, string> | null => {
  const patternParts = splitPath(pattern);
  const pathParts = splitPath(path);

  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i += 1) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];
    if (patternPart === undefined || pathPart === undefined) return null;

    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
      continue;
    }

    if (patternPart !== pathPart) return null;
  }

  return params;
};

export const findRoute = (
  routes: readonly MockRoute[],
  method: HttpMethod,
  url: string,
): MatchedRoute | null => {
  const path = url.split('?')[0] ?? url;

  for (const route of routes) {
    if (route.method !== method) continue;
    const params = matchPattern(route.pattern, path);
    if (params !== null) return { route, params };
  }

  return null;
};

const stringify = (value: QueryValue): string | null =>
  value === undefined || value === null ? null : String(value);

/**
 * `Array.isArray` narrows the positive branch but does not remove
 * `readonly T[]` from the union in the negative branch, so the guard is written
 * explicitly.
 */
const isQueryList = (
  value: QueryValue | readonly QueryValue[],
): value is readonly QueryValue[] => Array.isArray(value);

const first = (value: QueryValue | readonly QueryValue[] | undefined): string | null => {
  if (value === undefined || value === null) return null;
  if (isQueryList(value)) return stringify(value[0] ?? null);
  return stringify(value);
};

export const createQueryAccess = (
  params: Readonly<Record<string, QueryValue | readonly QueryValue[]>> | undefined,
): QueryAccess => ({
  string: (key, fallback) => first(params?.[key]) ?? fallback,
  optionalString: (key) => first(params?.[key]),
  number: (key) => {
    const raw = first(params?.[key]);
    if (raw === null || raw.trim() === '') return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  },
  boolean: (key) => first(params?.[key]) === 'true',
  list: (key) => {
    const value = params?.[key];
    if (value === undefined || value === null) return [];

    if (isQueryList(value)) {
      return value.map(stringify).filter((entry): entry is string => entry !== null);
    }

    // Repeated params and comma-separated lists are both accepted; the services
    // send the comma form.
    const raw = stringify(value) ?? '';
    return raw === '' ? [] : raw.split(',');
  },
});
