import { MATCH_THRESHOLDS } from '@/lib/scoring';
import { ApiError, NEW_JOB_WINDOW_DAYS, asJobId } from '@/types';
import type {
  Job,
  JobDetailResponse,
  JobListItem,
  JobMatch,
  Paginated,
  SkillRef,
} from '@/types';

import { JOBS } from '../data/jobs';
import { mockDb } from '../db/mockDb';
import { computeMatch } from '../matching';
import type { HandlerContext, MockRoute } from '../transport/router';

const DEFAULT_PAGE_SIZE = 10;

/**
 * Skills the scoring engine treats as "owned", taken from the active CV's
 * analysis. Users who skipped CV upload get an empty list, which is what makes
 * the preference-only matching path real rather than theoretical.
 */
const userSkills = (userId: string | null): readonly SkillRef[] => {
  if (userId === null) return [];
  const user = mockDb.state.users[userId];
  if (user?.activeCvId == null) return [];
  return mockDb.state.analysesByCvId[user.activeCvId]?.detectedSkills ?? [];
};

const matchFor = (job: Job, userId: string | null): JobMatch | null => {
  if (userId === null) return null;
  const user = mockDb.state.users[userId];
  if (user === undefined) return null;

  return computeMatch({ job, userSkills: userSkills(userId), preferences: user.preferences });
};

const applicationJobIds = (userId: string | null, statuses: readonly string[]): ReadonlySet<string> =>
  new Set(
    Object.values(mockDb.state.applications)
      .filter((application) => application.userId === userId && statuses.includes(application.status))
      .map((application) => application.jobId),
  );

const matchesText = (job: Job, term: string): boolean => {
  if (term === '') return true;
  const needle = term.toLowerCase();
  return (
    job.title.toLowerCase().includes(needle) ||
    job.company.name.toLowerCase().includes(needle) ||
    job.location.toLowerCase().includes(needle) ||
    job.summary.toLowerCase().includes(needle) ||
    job.requiredSkills.some((skill) => skill.name.toLowerCase().includes(needle))
  );
};

const listJobs = (context: HandlerContext): Paginated<JobListItem> => {
  const { query, userId } = context;

  const term = query.string('q', '').trim();
  const roles = query.list('roles');
  const locations = query.list('locations');
  const remoteModes = query.list('remoteModes');
  const jobTypes = query.list('jobTypes');
  const seniorities = query.list('seniorities');
  const salaryMin = query.number('salaryMin');
  const sort = query.string('sort', 'relevance');
  const tab = query.string('tab', 'all');
  const page = Math.max(1, query.number('page') ?? 1);
  const pageSize = Math.max(1, query.number('pageSize') ?? DEFAULT_PAGE_SIZE);

  // The saved tab shows anything the user has engaged with, not only records
  // still sitting in the `saved` status.
  const savedIds = applicationJobIds(userId, [
    'saved',
    'applied',
    'interview',
    'offer',
    'rejected',
  ]);

  const newCutoff = Date.now() - NEW_JOB_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  // Score first: the "matched" tab and relevance sort both depend on it.
  let rows: JobListItem[] = JOBS.map((job) => ({ job, match: matchFor(job, userId) }));

  rows = rows.filter(({ job, match }) => {
    if (!matchesText(job, term)) return false;
    if (roles.length > 0 && !roles.includes(job.roleKey)) return false;
    if (locations.length > 0 && !locations.some((location) => job.location.includes(location))) {
      return false;
    }
    if (remoteModes.length > 0 && !remoteModes.includes(job.remoteMode)) return false;
    if (jobTypes.length > 0 && !jobTypes.includes(job.jobType)) return false;
    if (seniorities.length > 0 && !seniorities.includes(job.seniority)) return false;
    if (salaryMin !== null && (job.salary === null || job.salary.max < salaryMin)) return false;

    switch (tab) {
      case 'fullMatch':
        return match !== null && match.score >= MATCH_THRESHOLDS.high;
      case 'new':
        return new Date(job.postedAt).getTime() >= newCutoff;
      case 'saved':
        return savedIds.has(job.id);
      default:
        return true;
    }
  });

  rows.sort((left, right) => {
    switch (sort) {
      case 'newest':
        return new Date(right.job.postedAt).getTime() - new Date(left.job.postedAt).getTime();
      case 'salaryDesc':
        return (right.job.salary?.max ?? 0) - (left.job.salary?.max ?? 0);
      case 'salaryAsc':
        return (left.job.salary?.min ?? Number.MAX_SAFE_INTEGER) -
          (right.job.salary?.min ?? Number.MAX_SAFE_INTEGER);
      default:
        return (right.match?.score ?? -1) - (left.match?.score ?? -1);
    }
  });

  const total = rows.length;
  const start = (page - 1) * pageSize;
  const items = rows.slice(start, start + pageSize);

  return {
    items,
    page,
    pageSize,
    total,
    hasMore: start + items.length < total,
  };
};

const jobDetail = (context: HandlerContext): JobDetailResponse => {
  const id = context.params['jobId'] ?? '';
  const job = JOBS.find((entry) => entry.id === asJobId(id));

  if (job === undefined) {
    throw new ApiError('NOT_FOUND', `No job with id ${id}`, 404);
  }

  const similarJobIds = JOBS.filter(
    (entry) => entry.id !== job.id && entry.roleKey === job.roleKey,
  )
    .slice(0, 3)
    .map((entry) => entry.id);

  return { job, match: matchFor(job, context.userId), similarJobIds };
};

export const jobRoutes: readonly MockRoute[] = [
  { method: 'GET', pattern: '/jobs', latency: 'normal', handler: listJobs },
  { method: 'GET', pattern: '/jobs/:jobId', latency: 'fast', handler: jobDetail },
];
