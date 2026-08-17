import { count, eq, gte } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { database } from '../db/client.js';
import { cvAnalyses, jobs } from '../db/schema.js';

const NEW_JOB_WINDOW_DAYS = 7;

interface AnalysisPayload {
  score?: number;
  matchedJobsCount?: number;
  missingSkills?: unknown[];
}

/**
 * The dashboard's headline numbers.
 *
 * Everything here is read from what has actually been stored — the CV's
 * analysis and the jobs table — rather than computed fresh. The counts that
 * depend on applications are zero because there is no applications table yet,
 * and reporting zero is better than inventing a plausible figure.
 */
export const registerDashboardRoutes = (app: FastifyInstance): void => {
  app.get('/dashboard/metrics', async (request) => {
    const user = request.requireUser();
    const { db } = database();

    const analyses =
      user.activeCvId === null
        ? []
        : await db.select().from(cvAnalyses).where(eq(cvAnalyses.cvId, user.activeCvId)).limit(1);

    // jsonb comes back as `unknown`, so the shape is asserted once here rather
    // than at each read below.
    const payload = analyses[0]?.payload as AnalysisPayload | undefined;

    const cutoff = new Date(Date.now() - NEW_JOB_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const recent = await db.select({ value: count() }).from(jobs).where(gte(jobs.postedAt, cutoff));

    /*
     * Profile completion is the share of the things the product asks for that
     * the account has actually done, so the number moves for a real reason
     * rather than being a decorative percentage.
     */
    const done = [
      user.preferences !== null,
      user.activeCvId !== null,
      payload !== undefined,
      user.onboardingCompletedAt !== null,
    ].filter(Boolean).length;

    return {
      matchedJobsCount: payload?.matchedJobsCount ?? 0,
      newMatchesThisWeek: recent[0]?.value ?? 0,
      // No applications table yet. Zero is the honest answer.
      activeApplications: 0,
      interviewsScheduled: 0,
      applicationsSent: 0,
      missingSkillsCount: payload?.missingSkills?.length ?? 0,
      cvScore: payload?.score ?? null,
      profileCompletionPercent: Math.round((done / 4) * 100),
    };
  });

  /** Alerts and activity have no tables yet; empty is honest, and typed right. */
  app.get('/alerts', (request) => {
    request.requireUser();
    return [];
  });

  app.get('/activity', (request) => {
    request.requireUser();
    return [];
  });
};
