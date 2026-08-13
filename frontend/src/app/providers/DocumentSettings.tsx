import { useEffect } from 'react';

import { useAppSelector } from '@/app/hooks';
import { selectDirection, selectLocale, selectTheme } from '@/features/ui/uiSlice';

/**
 * Single owner of the <html> attributes.
 *
 * Theme, language and direction are derived from store state here and nowhere
 * else, so they cannot drift apart from what components render.
 */
export const DocumentSettings = (): null => {
  const theme = useAppSelector(selectTheme);
  const locale = useAppSelector(selectLocale);
  const direction = useAppSelector(selectDirection);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
  }, [locale, direction]);

  return null;
};
