import { createLogger } from './logger';

const log = createLogger('storage');

/**
 * Namespaced, versioned localStorage access.
 *
 * Only an explicit allowlist of keys is persisted (theme, locale, sidebar,
 * auth token, mock DB). Whole Redux slices are deliberately not persisted —
 * that is how stale user data survives a logout.
 */
export const STORAGE_KEYS = {
  theme: 'jobmatch.ui.theme',
  locale: 'jobmatch.ui.locale',
  sidebarCollapsed: 'jobmatch.ui.sidebarCollapsed',
  authToken: 'jobmatch.auth.token',
  onboarding: 'jobmatch.onboarding.draft.v1',
  mockDb: 'jobmatch.mock.db.v1',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

const isAvailable = (): boolean => {
  try {
    const probe = '__jobmatch_probe__';
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
};

let available: boolean | null = null;

const storageAvailable = (): boolean => {
  available ??= isAvailable();
  return available;
};

export const readString = (key: StorageKey): string | null => {
  if (!storageAvailable()) return null;
  return window.localStorage.getItem(key);
};

export const writeString = (key: StorageKey, value: string): void => {
  if (!storageAvailable()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // Quota exceeded is the realistic failure here; it must not break the app.
    log.warn('write failed', { key, error: String(error) });
  }
};

export const readJson = <T>(key: StorageKey, isValid: (value: unknown) => value is T): T | null => {
  const raw = readString(key);
  if (raw === null) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValid(parsed)) {
      log.warn('discarding value that failed validation', { key });
      remove(key);
      return null;
    }
    return parsed;
  } catch {
    log.warn('discarding unparseable value', { key });
    remove(key);
    return null;
  }
};

export const writeJson = (key: StorageKey, value: unknown): void => {
  try {
    writeString(key, JSON.stringify(value));
  } catch (error) {
    log.warn('serialization failed', { key, error: String(error) });
  }
};

export const remove = (key: StorageKey): void => {
  if (!storageAvailable()) return;
  window.localStorage.removeItem(key);
};
