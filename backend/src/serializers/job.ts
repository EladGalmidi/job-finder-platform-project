import type { CompanyRow, JobRow } from '../db/schema.js';

export interface SkillRefJson {
  readonly skillId: string;
  readonly name: string;
  readonly level?: string;
  readonly weight?: number;
}

/** The Job shape declared in the frontend's src/types/job.ts. */
export interface JobJson {
  readonly id: string;
  readonly title: string;
  readonly roleKey: string;
  readonly company: CompanyRow;
  readonly location: string;
  readonly remoteMode: string;
  readonly jobType: string;
  readonly seniority: string;
  readonly salary: {
    readonly min: number;
    readonly max: number;
    readonly currency: string;
    readonly period: string;
  } | null;
  readonly summary: string;
  readonly description: string;
  readonly responsibilities: readonly string[];
  readonly requirements: readonly string[];
  readonly niceToHave: readonly string[];
  readonly requiredSkills: readonly SkillRefJson[];
  readonly postedAt: string;
  readonly source: string;
  readonly externalUrl: string;
  readonly isPromoted: boolean;
  readonly applicantsCount: number;
  readonly contentLanguage: string;
}

/**
 * Rebuilds the nested Job the frontend expects from its flattened row.
 *
 * Salary is four nullable columns in the table because the list filters on it;
 * the API still presents the SalaryRange object, so the storage decision stays
 * invisible to the client. Either all four are set or the salary is null —
 * a row with a min and no max would be a seeding bug, so it is reported as no
 * salary rather than as a half-built object.
 */
export const toJobJson = (
  job: JobRow,
  company: CompanyRow,
  requiredSkills: readonly SkillRefJson[],
): JobJson => ({
  id: job.id,
  title: job.title,
  roleKey: job.roleKey,
  company,
  location: job.location,
  remoteMode: job.remoteMode,
  jobType: job.jobType,
  seniority: job.seniority,
  salary:
    job.salaryMin !== null &&
    job.salaryMax !== null &&
    job.salaryCurrency !== null &&
    job.salaryPeriod !== null
      ? {
          min: job.salaryMin,
          max: job.salaryMax,
          currency: job.salaryCurrency,
          period: job.salaryPeriod,
        }
      : null,
  summary: job.summary,
  description: job.description,
  responsibilities: job.responsibilities,
  requirements: job.requirements,
  niceToHave: job.niceToHave,
  requiredSkills,
  postedAt: job.postedAt.toISOString(),
  source: job.source,
  externalUrl: job.externalUrl,
  isPromoted: job.isPromoted,
  applicantsCount: job.applicantsCount,
  contentLanguage: job.contentLanguage,
});
