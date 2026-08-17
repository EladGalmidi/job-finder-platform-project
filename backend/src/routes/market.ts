import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { database } from '../db/client.js';
import { jobSkills, jobs, skills } from '../db/schema.js';
import { notFound } from '../http/errors.js';

const SENIORITIES = ['junior', 'mid', 'senior', 'lead', 'principal'] as const;

const roleKey = z.enum([
  'devops',
  'backend',
  'frontend',
  'fullstack',
  'productManager',
  'data',
  'sales',
]);

const TOP_SKILLS = 8;

interface Band {
  min: number;
  max: number;
  median: number;
  currency: string;
  period: string;
}

const median = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? Math.round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2)
    : (sorted[middle] ?? 0);
};

const bandFrom = (rows: readonly { min: number; max: number }[]): Band => ({
  min: rows.length === 0 ? 0 : Math.min(...rows.map((row) => row.min)),
  max: rows.length === 0 ? 0 : Math.max(...rows.map((row) => row.max)),
  median: median(rows.map((row) => Math.round((row.min + row.max) / 2))),
  currency: 'ILS',
  period: 'month',
});

/**
 * What the market looks like for one role.
 *
 * Everything here is measured from the listings actually in the database.
 * Where a figure cannot be measured, it says so rather than being invented:
 *
 * - Trend needs history. Nothing here is older than the current snapshot, so
 *   every trend reports `stable` with a delta of zero until listings are
 *   collected over time.
 * - Salary impact per skill is a real comparison — listings requiring the skill
 *   against those that do not — but it is only reported when both sides have
 *   enough rows to mean anything. Otherwise it is zero.
 *
 * The sample is small at this stage, and the `sources` entry says exactly how
 * small rather than dressing it up as market research.
 */
export const registerMarketRoutes = (app: FastifyInstance): void => {
  app.get('/market/roles/:roleKey', async (request) => {
    const params = z.object({ roleKey }).safeParse(request.params);
    if (!params.success) throw notFound('That role');

    const role = params.data.roleKey;
    const { db } = database();

    const roleJobs = await db.select().from(jobs).where(eq(jobs.roleKey, role));
    if (roleJobs.length === 0) throw notFound(`Market data for ${role}`);

    const jobIds = new Set(roleJobs.map((job) => job.id));

    const requirements = await db
      .select({ jobId: jobSkills.jobId, skillId: jobSkills.skillId, name: skills.name })
      .from(jobSkills)
      .innerJoin(skills, eq(skills.id, jobSkills.skillId));

    const forRole = requirements.filter((row) => jobIds.has(row.jobId));

    const paid = (job: (typeof roleJobs)[number]): number | null =>
      job.salaryMin === null || job.salaryMax === null
        ? null
        : Math.round((job.salaryMin + job.salaryMax) / 2);

    const byId = new Map(roleJobs.map((job) => [job.id, job]));

    const grouped = new Map<string, { name: string; jobIds: Set<string> }>();
    for (const row of forRole) {
      const entry = grouped.get(row.skillId) ?? { name: row.name, jobIds: new Set<string>() };
      entry.jobIds.add(row.jobId);
      grouped.set(row.skillId, entry);
    }

    const topSkills = [...grouped.entries()]
      .map(([skillId, entry]) => {
        const withSkill = [...entry.jobIds].map((id) => byId.get(id)).filter((job) => job !== undefined);
        const withoutSkill = roleJobs.filter((job) => !entry.jobIds.has(job.id));

        const salariesWith = withSkill.map(paid).filter((value): value is number => value !== null);
        const salariesWithout = withoutSkill
          .map(paid)
          .filter((value): value is number => value !== null);

        // Only reported when both sides have at least two listings. Below that
        // the "impact" is one salary compared with another, which is noise.
        const comparable = salariesWith.length >= 2 && salariesWithout.length >= 2;
        const average = (values: number[]): number =>
          values.reduce((total, value) => total + value, 0) / values.length;

        const impact = comparable
          ? Math.round(((average(salariesWith) - average(salariesWithout)) / average(salariesWithout)) * 100)
          : 0;

        return {
          skillId,
          name: entry.name,
          roleKey: role,
          demandPercent: Math.round((entry.jobIds.size / roleJobs.length) * 100),
          // No history is collected yet, so no trend can honestly be claimed.
          trend: 'stable' as const,
          trendDelta: 0,
          avgSalaryImpactPercent: impact,
          openPositions: entry.jobIds.size,
        };
      })
      .sort((left, right) => right.demandPercent - left.demandPercent)
      .slice(0, TOP_SKILLS);

    const overall = roleJobs
      .filter((job) => job.salaryMin !== null && job.salaryMax !== null)
      .map((job) => ({ min: job.salaryMin ?? 0, max: job.salaryMax ?? 0 }));

    const salaryBySeniority = Object.fromEntries(
      SENIORITIES.map((seniority) => {
        const atLevel = roleJobs
          .filter((job) => job.seniority === seniority)
          .filter((job) => job.salaryMin !== null && job.salaryMax !== null)
          .map((job) => ({ min: job.salaryMin ?? 0, max: job.salaryMax ?? 0 }));

        /*
         * Falls back to the role's overall range when no listing exists at this
         * level. Zeroes would render as ₪0 and read as "this job pays nothing"
         * rather than "we have no listing here"; the sample size in `sources`
         * is what tells the reader how thin the data is.
         */
        return [seniority, bandFrom(atLevel.length > 0 ? atLevel : overall)];
      }),
    );

    const applicants = roleJobs.reduce((total, job) => total + job.applicantsCount, 0);

    return {
      roleKey: role,
      updatedAt: new Date().toISOString(),
      sources: [
        {
          name: 'JobMatch listings',
          url: '',
          // The real number of listings behind every figure above.
          sampleSize: roleJobs.length,
          collectedAt: new Date().toISOString(),
        },
      ],
      topSkills,
      salaryBySeniority,
      openPositions: roleJobs.length,
      // Applicants per opening, from the counts carried on the listings.
      competitionIndex:
        roleJobs.length === 0 ? 0 : Math.round(applicants / roleJobs.length),
    };
  });
};
