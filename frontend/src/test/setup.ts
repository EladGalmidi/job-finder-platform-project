import '@testing-library/jest-dom/vitest';

import { afterEach, beforeEach, vi } from 'vitest';

import { installMockTransport } from '@/mocks/install';

// The app installs this during bootstrap; tests render components directly, so
// they install it here instead. Without it the client fails fast rather than
// quietly attempting a live call.
installMockTransport();

/**
 * jsdom does not implement matchMedia. Several layout hooks depend on it, so a
 * minimal stub is installed for every test. Individual tests can override it.
 */
beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});
