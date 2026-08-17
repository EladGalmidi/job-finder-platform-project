import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { database } from '../db/client.js';
import { applications, companies, jobSkills, jobs, skills } from '../db/schema.js';
import type { ApplicationRow } from '../db/schema.js';
import { conflict, notFound } from '../http/errors.js';
import { toJobJson, type SkillRefJson } from '../serializers/job.js';

const STATUSES = ['saved', 'applied', 'interview', 'offer', 'rejected'] as const;
type Status = (typeof STATUSES)[number];

interface Note {
  id: string;
  at: string;
  body: string;
}

interface TimelineEvent {
  id: string;
  at: string;
  from: Status | null;
  to: Status;
}

const serialize = (row: ApplicationRow) => ({
  id: row.id,
  userId: row.userId,
  jobId: row.jobId,
  status: row.status,
  savedAt: row.savedAt.toISOString(),
  appliedAt: row.appliedAt?.toISOString() ?? null,
  lastUpdatedAt: row.lastUpdatedAt.toISOString(),
  notes: row.notes,
  timeline: row.timeline,
  nextStep: row.nextStep,
});

/** Loads required skills for a set of jobs in one query rather than per row. */
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

export const registerApplicationRoutes = (app: FastifyInstance): void => {
  app.get('/applications', async (request) => {
    const user = request.requireUser();

    const query = z
      .object({
        q: z.string().trim().default(''),
        statuses: z
          .string()
          .optional()
          .transform((value) =>
            value === undefined || value === ''
              ? []
              : value.split(',').filter((part): part is Status => STATUSES.includes(part as Status)),
          ),
        sort: z.enum(['recent', 'oldest', 'company', 'status']).default('recent'),
      })
      .parse(request.query);

    const { db } = database();

    // Always scoped to the caller. This is the whole access control for the
    // endpoint: there is no id in the request that could point elsewhere.
    const conditions: SQL[] = [eq(applications.userId, user.id)];

    if (query.statuses.length > 0) {
      conditions.push(inArray(applications.status, query.statuses));
    }

    if (query.q !== '') {
      const needle = `%${query.q}%`;
      const search = or(ilike(jobs.title, needle), ilike(companies.name, needle));
      if (search !== undefined) conditions.push(search);
    }

    const orderBy = {
      recent: [desc(applications.lastUpdatedAt)],
      oldest: [asc(applications.lastUpdatedAt)],
      company: [asc(companies.name)],
      status: [asc(applications.status), desc(applications.lastUpdatedAt)],
    }[query.sort];

    const rows = await db
      .select({ application: applications, job: jobs, company: companies })
      .from(applications)
      .innerJoin(jobs, eq(jobs.id, applications.jobId))
      .innerJoin(companies, eq(companies.id, jobs.companyId))
      .where(and(...conditions))
      .orderBy(...orderBy);

    const bySkill = await skillsByJob(rows.map((row) => row.job.id));

    return rows.map((row) => ({
      application: serialize(row.application),
      job: toJobJson(row.job, row.company, bySkill.get(row.job.id) ?? []),
    }));
  });

  app.post('/applications', async (request, reply) => {
    const user = request.requireUser();
    const body = z
      .object({ jobId: z.string(), status: z.enum(['saved', 'applied']) })
      .parse(request.body);

    const { db } = database();

    const job = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.id, body.jobId)).limit(1);
    if (job[0] === undefined) throw notFound(`Job ${body.jobId}`);

    const now = new Date();
    const event: TimelineEvent = {
      id: randomUUID(),
      at: now.toISOString(),
      from: null,
      to: body.status,
    };

    /*
     * onConflictDoNothing rather than a lookup first. Saving a job twice is a
     * double-click, not an error worth surfacing — but two rows would be, and
     * only the unique index reliably prevents them.
     */
    const inserted = await db
      .insert(applications)
      .values({
        id: `app-${randomUUID()}`,
        userId: user.id,
        jobId: body.jobId,
        status: body.status,
        savedAt: now,
        appliedAt: body.status === 'applied' ? now : null,
        lastUpdatedAt: now,
        notes: [],
        timeline: [event],
      })
      .onConflictDoNothing()
      .returning();

    const row = inserted[0];
    if (row !== undefined) return reply.status(201).send(serialize(row));

    // Already tracked. Return what exists, so the UI's state matches the server.
    const existing = await db
      .select()
      .from(applications)
      .where(and(eq(applications.userId, user.id), eq(applications.jobId, body.jobId)))
      .limit(1);

    if (existing[0] === undefined) throw conflict('Could not save that job');
    return reply.status(200).send(serialize(existing[0]));
  });

  app.patch('/applications/:id', async (request) => {
    const user = request.requireUser();
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { status } = z.object({ status: z.enum(STATUSES) }).parse(request.body);

    const { db } = database();

    const found = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
    const current = found[0];
    if (current?.userId !== user.id) throw notFound(`Application ${id}`);

    const now = new Date();
    const event: TimelineEvent = {
      id: randomUUID(),
      at: now.toISOString(),
      from: current.status,
      to: status,
    };

    const updated = await db
      .update(applications)
      .set({
        status,
        // Recorded the first time it is reached and never moved afterwards:
        // "when did I apply" must not change because the status later moved on.
        appliedAt: current.appliedAt ?? (status === 'applied' ? now : null),
        lastUpdatedAt: now,
        timeline: [...(current.timeline as TimelineEvent[]), event],
      })
      .where(eq(applications.id, id))
      .returning();

    return serialize(updated[0] ?? current);
  });

  app.delete('/applications/:id', async (request) => {
    const user = request.requireUser();
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const { db } = database();

    // Scoped to the owner in the delete itself, so a guessed id removes nothing.
    const removed = await db
      .delete(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
      .returning({ id: applications.id });

    if (removed[0] === undefined) throw notFound(`Application ${id}`);

    return { ok: true };
  });

  app.post('/applications/:id/notes', async (request) => {
    const user = request.requireUser();
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { body } = z.object({ body: z.string().trim().min(1).max(2000) }).parse(request.body);

    const { db } = database();

    const found = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
    const current = found[0];
    if (current?.userId !== user.id) throw notFound(`Application ${id}`);

    const note: Note = { id: randomUUID(), at: new Date().toISOString(), body };

    const updated = await db
      .update(applications)
      .set({
        notes: [...(current.notes as Note[]), note],
        lastUpdatedAt: new Date(),
      })
      .where(eq(applications.id, id))
      .returning();

    return serialize(updated[0] ?? current);
  });
};
