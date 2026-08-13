import { createLogger } from '@/lib/logger';
import { ApiError, type ApiErrorCode } from '@/types';

const log = createLogger('mockFaults');

export interface FaultConfig {
  /** Fail every request until cleared. */
  readonly code: ApiErrorCode;
  readonly status: number;
  /** Restrict the fault to URLs containing this substring. */
  readonly urlContains?: string;
}

let active: FaultConfig | null = null;

/**
 * Deliberate failure injection.
 *
 * Error states only get built if they are trivially reachable. The /dev/ui panel
 * drives this so a 500, a 401 or a timeout can be produced on demand without
 * editing code.
 */
export const faults = {
  set(config: FaultConfig | null): void {
    active = config;
    log.info(config === null ? 'faults cleared' : 'fault armed', { config });
  },

  current(): FaultConfig | null {
    return active;
  },

  check(url: string): void {
    if (active === null) return;
    if (active.urlContains !== undefined && !url.includes(active.urlContains)) return;

    throw new ApiError(active.code, `Injected fault: ${active.code}`, active.status);
  },
};
