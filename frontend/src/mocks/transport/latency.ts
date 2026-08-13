import { ApiError } from '@/types';

const parseMultiplier = (): number => {
  const raw = Number.parseFloat(import.meta.env.VITE_MOCK_LATENCY);
  return Number.isFinite(raw) && raw >= 0 ? raw : 1;
};

const MULTIPLIER = parseMultiplier();

/** Endpoints feel different from each other; a flat delay makes the mock obvious. */
export const LATENCY_PROFILES = {
  fast: [120, 280],
  normal: [250, 600],
  slow: [600, 1100],
} as const;

export type LatencyProfile = keyof typeof LATENCY_PROFILES;

/**
 * Delays, and rejects immediately if the caller aborts mid-flight. Without the
 * abort wiring, cancelled requests would still resolve and write into state.
 */
export const delay = (profile: LatencyProfile, signal?: AbortSignal): Promise<void> => {
  const [min, max] = LATENCY_PROFILES[profile];
  const ms = (min + Math.random() * (max - min)) * MULTIPLIER;

  return new Promise((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(new ApiError('CANCELLED', 'Request was cancelled', 0));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    function onAbort(): void {
      clearTimeout(timer);
      reject(new ApiError('CANCELLED', 'Request was cancelled', 0));
    }

    signal?.addEventListener('abort', onAbort, { once: true });
  });
};
