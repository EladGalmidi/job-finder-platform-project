import { useCallback, useMemo } from 'react';

import { useAppSelector } from '@/app/hooks';
import { selectDirection, selectLocale } from '@/features/ui/uiSlice';
import type { Direction, Locale } from '@/types';

import { localeTag, translate, translatePlural } from './t';
import type { PluralKey, TranslationKey, TranslationVars } from './types';

export interface Translation {
  readonly t: (key: TranslationKey, vars?: TranslationVars) => string;
  readonly tPlural: (base: PluralKey, count: number, vars?: TranslationVars) => string;
  readonly locale: Locale;
  readonly direction: Direction;
  readonly localeTag: string;
}

export const useTranslation = (): Translation => {
  const locale = useAppSelector(selectLocale);
  const direction = useAppSelector(selectDirection);

  const t = useCallback(
    (key: TranslationKey, vars?: TranslationVars) => translate(locale, key, vars),
    [locale],
  );

  const tPlural = useCallback(
    (base: PluralKey, count: number, vars?: TranslationVars) =>
      translatePlural(locale, base, count, vars),
    [locale],
  );

  return useMemo(
    () => ({ t, tPlural, locale, direction, localeTag: localeTag(locale) }),
    [t, tPlural, locale, direction],
  );
};
