import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../app.js';
import { __setEnv, loadEnv } from '../config/env.js';
import { closeDatabase, createDatabase } from '../db/client.js';

const testEnv = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL:
    process.env['DATABASE_URL'] ?? 'postgres://jobmatch:jobmatch@localhost:5433/jobmatch',
  SESSION_SECRET: 'a-test-secret-that-is-long-enough-to-pass',
  LOG_LEVEL: 'fatal',
});

const databaseReachable = await (async (): Promise<boolean> => {
  const { sql } = createDatabase(testEnv.DATABASE_URL, 1);
  try {
    await sql`select 1`;
    return true;
  } catch {
    return false;
  } finally {
    await sql.end();
  }
})();

describe.skipIf(!databaseReachable)('applications', () => {
  let app: FastifyInstance;
  let cookie: string;
  let otherCookie: string;
  let jobId: string;

  const signUp = async (): Promise<string> => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        fullName: 'Applicant',
        email: `apps+${String(Date.now())}-${String(Math.random()).slice(2, 8)}@example.com`,
        password: 'a-long-enough-password',
      },
    });
    return String(response.headers['set-cookie']).split(';')[0] ?? '';
  };

  beforeAll(async () => {
    __setEnv(testEnv);
    app = await buildApp();
    await app.ready();

    cookie = await signUp();
    otherCookie = await signUp();

    const jobs = await app.inject({ method: 'GET', url: '/jobs?pageSize=1' });
    jobId = jobs.json<{ items: { job: { id: string } }[] }>().items[0]?.job.id ?? '';
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
    __setEnv(undefined);
  });

  const save = (auth: string, status: 'saved' | 'applied' = 'saved') =>
    app.inject({ method: 'POST', url: '/applications', headers: { cookie: auth }, payload: { jobId, status } });

  it('saves a job and returns it with the job attached', async () => {
    const created = await save(cookie);
    expect(created.statusCode).toBe(201);

    const list = await app.inject({ method: 'GET', url: '/applications', headers: { cookie } });
    const rows = list.json<{ application: { status: string }; job: { id: string } }[]>();

    // The job travels with the application, so the list does not need a request
    // per row just to render a title.
    expect(rows[0]?.job.id).toBe(jobId);
    expect(rows[0]?.application.status).toBe('saved');
  });

  it('does not create a second row when the same job is saved twice', async () => {
    const again = await save(cookie);

    // A double-click is not an error worth surfacing, but two rows would be:
    // the job would appear twice with two different statuses.
    expect(again.statusCode).toBe(200);

    const list = await app.inject({ method: 'GET', url: '/applications', headers: { cookie } });
    expect(list.json<unknown[]>()).toHaveLength(1);
  });

  it('records the timeline and stamps appliedAt once', async () => {
    const list = await app.inject({ method: 'GET', url: '/applications', headers: { cookie } });
    const id = list.json<{ application: { id: string } }[]>()[0]?.application.id ?? '';

    const applied = await app.inject({
      method: 'PATCH',
      url: `/applications/${id}`,
      headers: { cookie },
      payload: { status: 'applied' },
    });

    const first = applied.json<{ appliedAt: string; timeline: unknown[] }>();
    expect(first.appliedAt).not.toBeNull();
    expect(first.timeline).toHaveLength(2);

    const interview = await app.inject({
      method: 'PATCH',
      url: `/applications/${id}`,
      headers: { cookie },
      payload: { status: 'interview' },
    });

    // "When did I apply" must not move because the status advanced afterwards.
    expect(interview.json<{ appliedAt: string }>().appliedAt).toBe(first.appliedAt);
  });

  it('shows the job under the saved tab, and only to its owner', async () => {
    const mine = await app.inject({ method: 'GET', url: '/jobs?tab=saved', headers: { cookie } });
    expect(mine.json<{ total: number }>().total).toBe(1);

    const theirs = await app.inject({
      method: 'GET',
      url: '/jobs?tab=saved',
      headers: { cookie: otherCookie },
    });
    expect(theirs.json<{ total: number }>().total).toBe(0);

    // Signed out, the honest answer is none — not the entire catalogue.
    const anonymous = await app.inject({ method: 'GET', url: '/jobs?tab=saved' });
    expect(anonymous.json<{ total: number }>().total).toBe(0);
  });

  it('counts applications on the dashboard', async () => {
    const metrics = await app.inject({
      method: 'GET',
      url: '/dashboard/metrics',
      headers: { cookie },
    });

    const body = metrics.json<{ activeApplications: number; applicationsSent: number }>();
    expect(body.activeApplications).toBe(1);
    expect(body.applicationsSent).toBe(1);
  });

  it('refuses to let another account read, change or delete it', async () => {
    const list = await app.inject({ method: 'GET', url: '/applications', headers: { cookie } });
    const id = list.json<{ application: { id: string } }[]>()[0]?.application.id ?? '';

    const theirList = await app.inject({
      method: 'GET',
      url: '/applications',
      headers: { cookie: otherCookie },
    });
    expect(theirList.json<unknown[]>()).toHaveLength(0);

    const patch = await app.inject({
      method: 'PATCH',
      url: `/applications/${id}`,
      headers: { cookie: otherCookie },
      payload: { status: 'rejected' },
    });
    expect(patch.statusCode).toBe(404);

    const removed = await app.inject({
      method: 'DELETE',
      url: `/applications/${id}`,
      headers: { cookie: otherCookie },
    });
    expect(removed.statusCode).toBe(404);

    // Still there, and still the owner's.
    const after = await app.inject({ method: 'GET', url: '/applications', headers: { cookie } });
    expect(after.json<unknown[]>()).toHaveLength(1);
  });

  it('adds a note and deletes the application', async () => {
    const list = await app.inject({ method: 'GET', url: '/applications', headers: { cookie } });
    const id = list.json<{ application: { id: string } }[]>()[0]?.application.id ?? '';

    const noted = await app.inject({
      method: 'POST',
      url: `/applications/${id}/notes`,
      headers: { cookie },
      payload: { body: 'Recruiter said they would call on Thursday' },
    });
    expect(noted.json<{ notes: unknown[] }>().notes).toHaveLength(1);

    const empty = await app.inject({
      method: 'POST',
      url: `/applications/${id}/notes`,
      headers: { cookie },
      payload: { body: '   ' },
    });
    expect(empty.statusCode).toBe(422);

    expect(
      (await app.inject({ method: 'DELETE', url: `/applications/${id}`, headers: { cookie } }))
        .statusCode,
    ).toBe(200);

    const after = await app.inject({ method: 'GET', url: '/applications', headers: { cookie } });
    expect(after.json<unknown[]>()).toHaveLength(0);
  });

  it('refuses to save a job that does not exist', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/applications',
      headers: { cookie },
      payload: { jobId: 'job-nope', status: 'saved' },
    });

    expect(response.statusCode).toBe(404);
  });
});
