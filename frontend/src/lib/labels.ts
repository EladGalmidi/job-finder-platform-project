import type { TranslationKey } from '@/i18n/types';
import type {
  AnalysisStepKey,
  ApplicationStatus,
  CVScoreSectionKey,
  JobType,
  MarketTrend,
  RecommendationSeverity,
  RemoteMode,
  RoleKey,
  Seniority,
  SkillPriority,
} from '@/types';

/**
 * Enum-to-translation-key maps.
 *
 * Typed as exhaustive Records, so adding a new role or job type without adding
 * its label is a compile error rather than a raw enum value leaking into the UI.
 */

export const ROLE_LABEL: Record<RoleKey, TranslationKey> = {
  devops: 'role.devops',
  backend: 'role.backend',
  frontend: 'role.frontend',
  fullstack: 'role.fullstack',
  productManager: 'role.productManager',
  data: 'role.data',
};

export const SENIORITY_LABEL: Record<Seniority, TranslationKey> = {
  junior: 'seniority.junior',
  mid: 'seniority.mid',
  senior: 'seniority.senior',
  lead: 'seniority.lead',
  principal: 'seniority.principal',
};

export const JOB_TYPE_LABEL: Record<JobType, TranslationKey> = {
  fullTime: 'jobType.fullTime',
  partTime: 'jobType.partTime',
  contract: 'jobType.contract',
  student: 'jobType.student',
  internship: 'jobType.internship',
};

export const REMOTE_LABEL: Record<RemoteMode | 'any', TranslationKey> = {
  onsite: 'remote.onsite',
  hybrid: 'remote.hybrid',
  remote: 'remote.remote',
  any: 'remote.any',
};

export const CV_SECTION_LABEL: Record<CVScoreSectionKey, TranslationKey> = {
  structure: 'cvSection.structure',
  skills: 'cvSection.skills',
  experience: 'cvSection.experience',
  keywords: 'cvSection.keywords',
  education: 'cvSection.education',
  impact: 'cvSection.impact',
};

export const ANALYSIS_STEP_LABEL: Record<AnalysisStepKey, TranslationKey> = {
  parsing: 'onboarding.analyzing.step.parsing',
  extractingSkills: 'onboarding.analyzing.step.extractingSkills',
  scoringStructure: 'onboarding.analyzing.step.scoringStructure',
  comparingMarket: 'onboarding.analyzing.step.comparingMarket',
  matchingJobs: 'onboarding.analyzing.step.matchingJobs',
  buildingRecommendations: 'onboarding.analyzing.step.buildingRecommendations',
};

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, TranslationKey> = {
  saved: 'applications.statusSaved',
  applied: 'applications.statusApplied',
  interview: 'applications.statusInterview',
  offer: 'applications.statusOffer',
  rejected: 'applications.statusRejected',
};

/** Badge tone per status, so colour and label always agree. */
export const APPLICATION_STATUS_TONE: Record<
  ApplicationStatus,
  'neutral' | 'info' | 'warning' | 'success' | 'danger'
> = {
  saved: 'neutral',
  applied: 'info',
  interview: 'warning',
  offer: 'success',
  rejected: 'danger',
};

export const MARKET_TREND_LABEL: Record<MarketTrend, TranslationKey> = {
  up: 'market.trendUp',
  down: 'market.trendDown',
  stable: 'market.trendStable',
};

export const PRIORITY_LABEL: Record<SkillPriority, TranslationKey> = {
  high: 'priority.high',
  medium: 'priority.medium',
  low: 'priority.low',
};

export const SEVERITY_LABEL: Record<RecommendationSeverity, TranslationKey> = {
  critical: 'severity.critical',
  important: 'severity.important',
  nice: 'severity.nice',
};

/** Locations offered during onboarding. Mirrors the seeded job catalogue. */
export const LOCATION_OPTIONS: string[] = [
  'Tel Aviv',
  'Herzliya',
  'Ramat Gan',
  'Haifa',
  'Jerusalem',
  'Beer Sheva',
  'Remote',
];
