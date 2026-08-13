import type {
  CompanyId,
  ContentLanguage,
  ISODateTime,
  JobId,
  JobType,
  RemoteMode,
  RoleKey,
  SalaryRange,
  Seniority,
  SkillId,
} from './common';

export type SkillCategory = 'language' | 'framework' | 'cloud' | 'tool' | 'soft' | 'methodology';

export type SkillLevel = 'basic' | 'proficient' | 'expert';

export interface Skill {
  id: SkillId;
  name: string;
  category: SkillCategory;
  aliases: string[];
}

export interface SkillRef {
  skillId: SkillId;
  name: string;
  level?: SkillLevel;
  /** Relative importance within a job's requirement list, 0..1. */
  weight?: number;
}

export interface Company {
  id: CompanyId;
  name: string;
  /** Two-letter monogram rendered in place of a logo image. */
  logoText: string;
  logoColor: string;
  industry: string;
  sizeRange: string;
  website: string;
}

export type JobSource = 'linkedin' | 'comeet' | 'greenhouse' | 'company';

export interface Job {
  id: JobId;
  title: string;
  roleKey: RoleKey;
  company: Company;
  location: string;
  remoteMode: RemoteMode;
  jobType: JobType;
  seniority: Seniority;
  salary: SalaryRange | null;
  summary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  requiredSkills: SkillRef[];
  postedAt: ISODateTime;
  source: JobSource;
  externalUrl: string;
  isPromoted: boolean;
  applicantsCount: number;
  /**
   * Language the listing itself is written in — independent of UI locale.
   * Job cards set `dir` from this, not from the active locale.
   */
  contentLanguage: ContentLanguage;
}

export type MatchBand = 'high' | 'medium' | 'low';

export type MatchReasonKind = 'skills' | 'seniority' | 'location' | 'salary' | 'role';

export interface MatchReason {
  kind: MatchReasonKind;
  impact: 'positive' | 'negative' | 'neutral';
  text: string;
}

/**
 * Per-user scoring, deliberately separate from `Job`.
 *
 * Baking a score into the job entity would couple the shared job catalogue to a
 * single user and break the moment a real backend serves jobs to everyone.
 */
export interface JobMatch {
  jobId: JobId;
  score: number;
  matchingSkills: SkillRef[];
  missingSkills: SkillRef[];
  reasons: MatchReason[];
  computedAt: ISODateTime;
}

/** What `GET /jobs` returns per row — avoids an N+1 for match data. */
export interface JobListItem {
  job: Job;
  match: JobMatch | null;
}

export interface JobDetailResponse {
  job: Job;
  match: JobMatch | null;
  similarJobIds: JobId[];
}

export type JobSort = 'relevance' | 'newest' | 'salaryDesc' | 'salaryAsc';

export type JobTab = 'all' | 'matched' | 'saved' | 'applied';

/** Mirrors the `/jobs` query string exactly; the URL is the source of truth. */
export interface JobQuery {
  q: string;
  roles: RoleKey[];
  locations: string[];
  remoteModes: RemoteMode[];
  jobTypes: JobType[];
  seniorities: Seniority[];
  salaryMin: number | null;
  sort: JobSort;
  tab: JobTab;
  page: number;
}
