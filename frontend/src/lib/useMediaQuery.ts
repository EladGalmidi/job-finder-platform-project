import { useEffect, useState } from 'react';

import { BREAKPOINTS, type BreakpointKey } from '@/styles/breakpoints';

/**
 * Subscribes to a media query. Reads the initial value synchronously so the
 * first paint is already correct rather than flipping layout after mount.
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const list = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent): void => {
      setMatches(event.matches);
    };

    setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => {
      list.removeEventListener('change', onChange);
    };
  }, [query]);

  return matches;
};

export const useBreakpointUp = (key: BreakpointKey): boolean =>
  useMediaQuery(`(min-width: ${String(BREAKPOINTS[key])}px)`);

export const useBreakpointDown = (key: BreakpointKey): boolean =>
  useMediaQuery(`(max-width: ${String(BREAKPOINTS[key] - 1)}px)`);

/** Desktop layout threshold: the fixed sidebar appears at md and above. */
export const useIsDesktop = (): boolean => useBreakpointUp('md');
