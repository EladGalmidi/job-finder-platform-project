import { createLogger } from '@/lib/logger';
import { STORAGE_KEYS, readJson, remove, writeJson } from '@/lib/storage';
import type {
  Activity,
  Alert,
  AnalysisJob,
  Application,
  CV,
  CVAnalysis,
  User,
} from '@/types';

import { APPLICATIONS } from '../data/applications';
import { DEMO_CV, DEMO_CV_ANALYSIS } from '../data/cv';
import { ACTIVITY, ALERTS } from '../data/insights';
import { DEMO_USER, NEW_USER } from '../data/user';

const log = createLogger('mockDb');

/**
 * Bumping this wipes and reseeds. Any change to the persisted shape must bump it,
 * otherwise returning users get a half-migrated store.
 */
// v2: alerts and activity gained a `userId` so the feeds are scoped per account.
// v3: uploaded CV text is stored so analysis can be derived from the real file.
const SCHEMA_VERSION = 3;

/**
 * Only mutable entities are persisted. Jobs, skills, companies and market data
 * are static fixtures rehydrated from source on every load, which keeps the
 * stored payload small and avoids a stale catalogue after a fixture edit.
 *
 * Known limitation: no cross-tab synchronisation. Two open tabs each hold their
 * own in-memory copy and the last write wins.
 */
export interface MockDbState {
  version: number;
  users: Record<string, User>;
  cvs: Record<string, CV>;
  /**
   * Extracted CV text, keyed by CV id. Held separately from the `CV` record so
   * the domain model stays free of a field only the stand-in backend needs. A
   * real deployment keeps this server-side and never ships it to the browser.
   */
  cvText: Record<string, string>;
  analysesByCvId: Record<string, CVAnalysis>;
  applications: Record<string, Application>;
  alerts: Record<string, Alert>;
  activity: Record<string, Activity>;
  analysisJobs: Record<string, AnalysisJob>;
  /** token -> userId */
  sessions: Record<string, string>;
}

const byId = <T extends { id: string }>(items: readonly T[]): Record<string, T> =>
  Object.fromEntries(items.map((item) => [item.id, item]));

const createSeedState = (): MockDbState => ({
  version: SCHEMA_VERSION,
  users: byId([DEMO_USER, NEW_USER]),
  cvs: byId([DEMO_CV]),
  cvText: {},
  analysesByCvId: { [DEMO_CV.id]: DEMO_CV_ANALYSIS },
  applications: byId(APPLICATIONS),
  alerts: byId(ALERTS),
  activity: byId(ACTIVITY),
  analysisJobs: {},
  sessions: {},
});

const isPersistedState = (value: unknown): value is MockDbState => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return candidate['version'] === SCHEMA_VERSION && typeof candidate['users'] === 'object';
};

const load = (): MockDbState => {
  const stored = readJson(STORAGE_KEYS.mockDb, isPersistedState);
  if (stored !== null) {
    log.debug('restored from storage');
    return stored;
  }
  log.info('seeding fresh mock database', { version: SCHEMA_VERSION });
  return createSeedState();
};

let state: MockDbState = load();

const persist = (): void => {
  writeJson(STORAGE_KEYS.mockDb, state);
};

export const mockDb = {
  get state(): MockDbState {
    return state;
  },

  /** Applies a mutation and persists atomically. */
  mutate(fn: (draft: MockDbState) => void): void {
    fn(state);
    persist();
  },

  reset(): void {
    remove(STORAGE_KEYS.mockDb);
    state = createSeedState();
    persist();
    log.info('mock database reset');
  },
};
