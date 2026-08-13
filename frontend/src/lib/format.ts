import type { ISODateTime, Locale, SalaryRange } from '@/types';

const tagFor = (locale: Locale): string => (locale === 'he' ? 'he-IL' : 'en-IL');

/**
 * Currency is data, not a translation.
 *
 * A role paying ILS 28,000/month pays that regardless of which language the page
 * is rendered in — only the formatting and the period label change.
 */
export const formatSalaryRange = (locale: Locale, range: SalaryRange): string => {
  const formatter = new Intl.NumberFormat(tagFor(locale), {
    style: 'currency',
    currency: range.currency,
    maximumFractionDigits: 0,
  });

  return `${formatter.format(range.min)} – ${formatter.format(range.max)}`;
};

export const formatNumber = (locale: Locale, value: number): string =>
  new Intl.NumberFormat(tagFor(locale)).format(value);

export const formatPercent = (locale: Locale, value: number): string =>
  new Intl.NumberFormat(tagFor(locale), { style: 'percent', maximumFractionDigits: 0 }).format(
    value / 100,
  );

export const formatDate = (locale: Locale, iso: ISODateTime): string =>
  new Intl.DateTimeFormat(tagFor(locale), { dateStyle: 'medium' }).format(new Date(iso));

const RELATIVE_UNITS: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

export const formatRelativeTime = (locale: Locale, iso: ISODateTime): string => {
  const formatter = new Intl.RelativeTimeFormat(tagFor(locale), { numeric: 'auto' });
  const diff = new Date(iso).getTime() - Date.now();
  const absolute = Math.abs(diff);

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (absolute >= ms) {
      return formatter.format(Math.round(diff / ms), unit);
    }
  }

  return formatter.format(0, 'second');
};

export const formatFileSize = (locale: Locale, bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${new Intl.NumberFormat(tagFor(locale), { maximumFractionDigits: 1 }).format(mb)} MB`;
  }
  const kb = Math.max(1, Math.round(bytes / 1024));
  return `${new Intl.NumberFormat(tagFor(locale)).format(kb)} KB`;
};
