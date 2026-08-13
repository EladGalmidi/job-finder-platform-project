/**
 * Shared primitives used across every domain model.
 *
 * Branded IDs cost nothing at runtime but make `getJob(applicationId)` a compile
 * error instead of a 404 at runtime.
 */

declare const brand: unique symbol;

type Brand<T, TBrand> = T & { readonly [brand]: TBrand };

export type UserId = Brand<string, 'UserId'>;
export type JobId = Brand<string, 'JobId'>;
export type CompanyId = Brand<string, 'CompanyId'>;
export type SkillId = Brand<string, 'SkillId'>;
export type CvId = Brand<string, 'CvId'>;
export type ApplicationId = Brand<string, 'ApplicationId'>;
export type AlertId = Brand<string, 'AlertId'>;
export type ActivityId = Brand<string, 'ActivityId'>;
export type AnalysisJobId = Brand<string, 'AnalysisJobId'>;

/** Casts are confined to the mock layer and API deserialisation boundary. */
export const asUserId = (value: string): UserId => value as UserId;
export const asJobId = (value: string): JobId => value as JobId;
export const asCompanyId = (value: string): CompanyId => value as CompanyId;
export const asSkillId = (value: string): SkillId => value as SkillId;
export const asCvId = (value: string): CvId => value as CvId;
export const asApplicationId = (value: string): ApplicationId => value as ApplicationId;
export const asAlertId = (value: string): AlertId => value as AlertId;
export const asActivityId = (value: string): ActivityId => value as ActivityId;
export const asAnalysisJobId = (value: string): AnalysisJobId => value as AnalysisJobId;

/** ISO-8601 timestamp, e.g. `2026-08-13T09:24:00.000Z`. */
export type ISODateTime = string;

export type Locale = 'en' | 'he';
export type Direction = 'ltr' | 'rtl';
export type Theme = 'light' | 'dark';

export type Seniority = 'junior' | 'mid' | 'senior' | 'lead' | 'principal';
export type JobType = 'fullTime' | 'partTime' | 'contract' | 'student' | 'internship';
export type RemoteMode = 'onsite' | 'hybrid' | 'remote';
export type RoleKey = 'devops' | 'backend' | 'frontend' | 'fullstack' | 'productManager' | 'data';

export const SENIORITIES: readonly Seniority[] = [
  'junior',
  'mid',
  'senior',
  'lead',
  'principal',
] as const;

export const JOB_TYPES: readonly JobType[] = [
  'fullTime',
  'partTime',
  'contract',
  'student',
  'internship',
] as const;

export const REMOTE_MODES: readonly RemoteMode[] = ['onsite', 'hybrid', 'remote'] as const;

export const ROLE_KEYS: readonly RoleKey[] = [
  'devops',
  'backend',
  'frontend',
  'fullstack',
  'productManager',
  'data',
] as const;

/** Roles offered by the market analysis page. */
export const MARKET_ROLE_KEYS: readonly RoleKey[] = [
  'devops',
  'backend',
  'frontend',
  'productManager',
] as const;

export type Currency = 'ILS' | 'USD';
export type SalaryPeriod = 'month' | 'year';

export interface SalaryRange {
  min: number;
  max: number;
  currency: Currency;
  period: SalaryPeriod;
}

/**
 * Language a piece of *content* is written in, independent of UI locale.
 *
 * A job posted in Hebrew stays Hebrew even when the interface is English —
 * which is exactly what the scraper will produce. Cards set `dir` per content
 * block rather than per page because of this field.
 */
export type ContentLanguage = Locale;

export interface LocalizedText {
  language: ContentLanguage;
  text: string;
}
