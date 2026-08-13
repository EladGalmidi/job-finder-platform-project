import type { Locale } from '@/types';

import { en } from './en';
import { he } from './he';
import type { Catalog, PluralKey, TranslationKey, TranslationVars } from './types';

const CATALOGS: Record<Locale, Catalog> = { en, he };

const PLACEHOLDER = /\{(\w+)\}/g;

const interpolate = (template: string, vars: TranslationVars | undefined): string => {
  if (vars === undefined) return template;
  return template.replace(PLACEHOLDER, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
};

export const translate = (
  locale: Locale,
  key: TranslationKey,
  vars?: TranslationVars,
): string => interpolate(CATALOGS[locale][key], vars);

/**
 * Plural selection via Intl.PluralRules rather than `count === 1`.
 *
 * Hebrew has one/two/many/other categories; a naive singular check produces
 * wrong grammar for exactly the counts users see most.
 */
export const translatePlural = (
  locale: Locale,
  base: PluralKey,
  count: number,
  vars?: TranslationVars,
): string => {
  const category = new Intl.PluralRules(locale === 'he' ? 'he-IL' : 'en-US').select(count);
  const catalog = CATALOGS[locale];

  const candidate = `${base}_${category}` as TranslationKey;
  const fallback = `${base}_other` as TranslationKey;
  const template = catalog[candidate] ?? catalog[fallback];

  return interpolate(template, { count, ...vars });
};

export const localeTag = (locale: Locale): string => (locale === 'he' ? 'he-IL' : 'en-IL');
