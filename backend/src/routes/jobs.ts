import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { database } from '../db/client.js';
import { companies, jobSkills, jobs, skills } from '../db/schema.js';
import { notFound } from '../http/errors.js';
import { toJobJson, type SkillRefJson } from '../serializers/job.js';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

/** Listings newer than this are shown under the "new" tab. */
const NEW_JOB_WINDOW_DAYS = 7;

/** Comma-separated repeated values, the format toJobParams already sends. */
const csv = z
  .string()
  .optional()
  .transform((value) =>
    value === undefined || value === '' ? [] : value.split(',').filter((part) => part !== ''),
  );

const listQuery = z.object({
  q: z.string().trim().default(''),
  roles: csv,
  locations: csv,
  remoteModes: csv,
  jobTypes: csv,
  seniorities: csv,
  salaryMin: z.coerce.number().int().nonnegative().optional(),
  sort: z.enum(['relevance', 'newest', 'salaryDesc', 'salaryAsc']).default('relevance'),
  tab: z.enum(['all', 'fullMatch', 'new', 'saved']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

/**
 * Loads the required skills for a set of jobs in one query.
 *
 * Fetching them per job would issue a query per row — the N+1 that turns a fast
 * page into a slow one the moment the result set grows.
 */
const skillsByJob = async (jobIds: readonly string[]): Promise<Map<string, SkillRefJson[]>> => {
  const grouped = new Map<string, SkillRefJson[]>();
  if (jobIds.length === 0) return grouped;

  const rows = await database()
    .db.select({
      jobId: jobSkills.jobId,
      skillId: jobSkills.skillId,
      name: skills.name,
      level: jobSkills.level,
      weight: jobSkills.weight,
    })
    .from(jobSkills)
    .innerJoin(skills, eq(skills.id, jobSkills.skillId))
    .where(inArray(jobSkills.jobId, [...jobIds]));

  for (const row of rows) {
    const list = grouped.get(row.jobId) ?? [];
    list.push({
      skillId: row.skillId,
      name: row.name,
      ...(row.level === null ? {} : { level: row.level }),
      ...(row.weight === null ? {} : { weight: row.weight }),
    });
    grouped.set(row.jobId, list);
  }

  return grouped;
};

export const registerJobRoutes = (app: FastifyInstance): void => {
  app.get('/jobs', async (request) => {
    const query = listQuery.parse(request.query);
    const { db } = database();

    const conditions: SQL[] = [];

    if (query.q !== '') {
      const needle = `%${query.q}%`;

      /*
       * Skill names are searched as well as the listing's own text, matching
       * what the mock did. Without it "kubernetes" finds only the listings that
       * happen to spell it in their title or summary — one, rather than the
       * nine that actually require it — which reads as a broken search.
       */
      const bySkillName = exists(
        db
          .select({ one: sql`1` })
          .from(jobSkills)
          .innerJoin(skills, eq(skills.id, jobSkills.skillId))
          .where(and(eq(jobSkills.jobId, jobs.id), ilike(skills.name, needle))),
      );

      const search = or(
        ilike(jobs.title, needle),
        ilike(jobs.summary, needle),
        ilike(jobs.location, needle),
        ilike(companies.name, needle),
        bySkillName,
      );
      if (search !== undefined) conditions.push(search);
    }

    /*
     * Filters are applied in SQL, not after fetching.
     *
     * The mock could pull every listing into memory and filter the array
     * because there were 31 of them. At any real size that is the difference
     * between a page load and a timeout.
     */
    if (query.roles.length > 0) {
      conditions.push(inArray(jobs.roleKey, query.roles as never[]));
    }
    if (query.remoteModes.length > 0) {
      conditions.push(inArray(jobs.remoteMode, query.remoteModes as never[]));
    }
    if (query.jobTypes.length > 0) {
      conditions.push(inArray(jobs.jobType, query.jobTypes as never[]));
    }
    if (query.seniorities.length > 0) {
      conditions.push(inArray(jobs.seniority, query.seniorities as never[]));
    }
    if (query.locations.length > 0) {
      // Substring match, because the frontend sends city names and a listing
      // may read "Tel Aviv (hybrid)".
      const byLocation = or(...query.locations.map((city) => ilike(jobs.location, `%${city}%`)));
      if (byLocation !== undefined) conditions.push(byLocation);
    }
    if (query.salaryMin !== undefined) {
      conditions.push(gte(jobs.salaryMax, query.salaryMin));
    }

    if (query.tab === 'new') {
      const cutoff = new Date(Date.now() - NEW_JOB_WINDOW_DAYS * 24 * 60 * 60 * 1000);
      conditions.push(gte(jobs.postedAt, cutoff));
    }

    /*
     * The `fullMatch` and `saved` tabs are not filtered yet, and deliberately
     * behave as `all` rather than silently returning nothing.
     *
     * `fullMatch` needs the scoring engine, which still lives in the frontend
     * and moves server-side with the CV work. `saved` needs an applications
     * table that does not exist yet. Both are tracked; neither is pretended.
     */

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const orderBy = {
      newest: [desc(jobs.postedAt)],
      salaryDesc: [desc(sql`coalesce(${jobs.salaryMax}, 0)`)],
      salaryAsc: [asc(sql`coalesce(${jobs.salaryMin}, 2147483647)`)],
      // Relevance needs match scores, which do not exist server-side yet, so it
      // falls back to recency — a sensible order rather than an arbitrary one.
      relevance: [desc(jobs.isPromoted), desc(jobs.postedAt)],
    }[query.sort];

    const rows = await db
      .select({ job: jobs, company: companies })
      .from(jobs)
      .innerJoin(companies, eq(companies.id, jobs.companyId))
      .where(where)
      .orderBy(...orderBy)
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);

    const totals = await db
      .select({ value: count() })
      .from(jobs)
      .innerJoin(companies, eq(companies.id, jobs.companyId))
      .where(where);

    const total = totals[0]?.value ?? 0;
    const bySkill = await skillsByJob(rows.map((row) => row.job.id));

    return {
      items: rows.map((row) => ({
        job: toJobJson(row.job, row.company, bySkill.get(row.job.id) ?? []),
        // Null until scoring moves server-side. The frontend already renders
        // this state, because an anonymous visitor has always seen it.
        match: null,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
      hasMore: (query.page - 1) * query.pageSize + rows.length < total,
    };
  });

  app.get('/jobs/:jobId', async (request) => {
    const { jobId } = z.object({ jobId: z.string() }).parse(request.params);
    const { db } = database();

    const rows = await db
      .select({ job: jobs, company: companies })
      .from(jobs)
      .innerJoin(companies, eq(companies.id, jobs.companyId))
      .where(eq(jobs.id, jobId))
      .limit(1);

    const row = rows[0];
    if (row === undefined) throw notFound(`Job ${jobId}`);

    const bySkill = await skillsByJob([row.job.id]);

    const similar = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.roleKey, row.job.roleKey), sql`${jobs.id} <> ${jobId}`))
      .orderBy(desc(jobs.postedAt))
      .limit(3);

    return {
      job: toJobJson(row.job, row.company, bySkill.get(row.job.id) ?? []),
      match: null,
      similarJobIds: similar.map((entry) => entry.id),
    };
  });
};
