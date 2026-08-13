import type { ISODateTime } from '@/types';

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export const nowIso = (): ISODateTime => new Date().toISOString();

export const minutesAgo = (minutes: number): ISODateTime =>
  new Date(Date.now() - minutes * MS_PER_MINUTE).toISOString();

export const hoursAgo = (hours: number): ISODateTime =>
  new Date(Date.now() - hours * MS_PER_HOUR).toISOString();

export const daysAgo = (days: number): ISODateTime =>
  new Date(Date.now() - days * MS_PER_DAY).toISOString();

export const daysFromNow = (days: number): ISODateTime =>
  new Date(Date.now() + days * MS_PER_DAY).toISOString();

/** Difference in whole days; negative when `iso` is in the future. */
export const daysSince = (iso: ISODateTime): number =>
  Math.floor((Date.now() - new Date(iso).getTime()) / MS_PER_DAY);
