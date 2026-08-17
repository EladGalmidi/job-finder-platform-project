import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../app.js';
import { __setEnv, loadEnv } from '../config/env.js';
import { closeDatabase, createDatabase } from '../db/client.js';

const testEnv = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL: process.env['DATABASE_URL'] ?? 'postgres://jobmatch:jobmatch@localhost:5433/jobmatch',
  SESSION_SECRET: 'a-test-secret-that-is-long-enough-to-pass',
  LOG_LEVEL: 'fatal',
});

/**
 * These talk to a real Postgres, because what they check — the unique index
 * deciding a duplicate signup, a revoked session failing on the next request —
 * only exists in the database. A stubbed one would test the stub.
 *
 * They skip rather than fail when it is unreachable, so `npm run validate` still
 * passes on a machine with no Docker running.
 */
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

const cookieFrom = (response: { headers: Record<string, unknown> }): string =>
  String(response.headers['set-cookie']).split(';')[0] ?? '';

const unique = (): string => `test+${String(Date.now())}-${String(Math.random()).slice(2, 8)}@example.com`;

describe.skipIf(!databaseReachable)('auth routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    __setEnv(testEnv);
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
    __setEnv(undefined);
  });

  const signup = (email: string, password = 'a-long-enough-password') =>
    app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { fullName: 'Test Person', email, password },
    });

  it('creates an account and returns the user without any secret', async () => {
    const response = await signup(unique());
    expect(response.statusCode).toBe(201);

    const body = response.json<{ user: Record<string, unknown> }>();
    expect(body.user['fullName']).toBe('Test Person');

    // The row has a password hash and an updated_at; neither may be published.
    expect(response.body).not.toContain('passwordHash');
    expect(response.body).not.toContain('scrypt$');
  });

  it('sets an httpOnly session cookie', async () => {
    const header = String((await signup(unique())).headers['set-cookie']);

    // httpOnly is the entire reason for moving off a localStorage token: script
    // on the page cannot read this, so an XSS cannot steal the session.
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Lax');
    expect(header).toContain('Path=/');
  });

  it('rejects a second signup that differs only in capitalisation', async () => {
    const email = unique();
    expect((await signup(email)).statusCode).toBe(201);

    const duplicate = await signup(email.toUpperCase());

    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toMatchObject({ code: 'CONFLICT' });
  });

  it('identifies the caller from the cookie and refuses without one', async () => {
    const created = await signup(unique());
    const cookie = cookieFrom(created);

    const withCookie = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } });
    expect(withCookie.statusCode).toBe(200);
    expect(withCookie.json<{ id: string }>().id).toBe(
      created.json<{ user: { id: string } }>().user.id,
    );

    const without = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(without.statusCode).toBe(401);
    expect(without.json()).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('reports a wrong password as INVALID_CREDENTIALS, not UNAUTHORIZED', async () => {
    const email = unique();
    await signup(email);

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'definitely-not-it' },
    });

    // A distinct code, because the UI shows different copy for "your password is
    // wrong" and "your session ended".
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('gives the same answer whether or not the account exists', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: unique(), password: 'a-long-enough-password' },
    });

    // Identical to the wrong-password case above. Anything else turns login
    // into a way to discover which email addresses are registered.
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('logs in with the right password and issues a fresh session', async () => {
    const email = unique();
    const first = cookieFrom(await signup(email));

    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'a-long-enough-password' },
    });

    expect(login.statusCode).toBe(200);
    expect(cookieFrom(login)).not.toBe(first);
  });

  it('makes the session dead immediately after logout', async () => {
    const cookie = cookieFrom(await signup(unique()));

    expect(
      (await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } })).statusCode,
    ).toBe(200);

    await app.inject({ method: 'POST', url: '/auth/logout', headers: { cookie } });

    // The same cookie value, now revoked in the database. Clearing it in the
    // browser is not enough — a copied token has to stop working too.
    expect(
      (await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } })).statusCode,
    ).toBe(401);
  });

  it('signs in through the development social stand-in', async () => {
    const response = await app.inject({ method: 'POST', url: '/auth/social/google' });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ user: { provider: string } }>().user.provider).toBe('google');
    expect(String(response.headers['set-cookie'])).toContain('HttpOnly');
  });

  it('refuses a provider it does not know', async () => {
    const response = await app.inject({ method: 'POST', url: '/auth/social/facebook' });

    expect(response.statusCode).toBe(422);
  });

  it('never lets a social account be signed into with a password', async () => {
    // The account exists after the test above and has no password hash. Login
    // must reject it rather than treat "no password" as "any password".
    await app.inject({ method: 'POST', url: '/auth/social/linkedin' });

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'linkedin.user@jobmatch.ai', password: 'anything-at-all' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('reports invalid fields individually so a form can mark them', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { fullName: 'A', email: 'not-an-email', password: 'short' },
    });

    expect(response.statusCode).toBe(422);
    const body = response.json<{ code: string; details: Record<string, string> }>();
    expect(body.code).toBe('VALIDATION_FAILED');
    expect(Object.keys(body.details).sort()).toEqual(['email', 'fullName', 'password']);
  });
});

describe.skipIf(!databaseReachable)('the social sign-in backdoor in production', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // The one thing that must be proven about a route that issues a session
    // without checking anything: that it does not exist in production.
    __setEnv({ ...testEnv, NODE_ENV: 'production' });
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
    __setEnv(undefined);
  });

  it('is not registered at all', async () => {
    const response = await app.inject({ method: 'POST', url: '/auth/social/google' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('still allows a normal password login', async () => {
    // Guards against the gate accidentally disabling real authentication too.
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'nobody@example.com', password: 'a-long-enough-password' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });
});

describe.skipIf(!databaseReachable)('job routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    __setEnv(testEnv);
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
    __setEnv(undefined);
  });

  const list = async (queryString: string) =>
    (await app.inject({ method: 'GET', url: `/jobs?${queryString}` })).json<{
      total: number;
      items: { job: { id: string; title: string } }[];
      hasMore: boolean;
    }>();

  it('paginates rather than returning everything', async () => {
    const page = await list('page=1&pageSize=3');

    expect(page.items).toHaveLength(3);
    expect(page.total).toBeGreaterThan(3);
    expect(page.hasMore).toBe(true);
  });

  it('finds jobs by a skill they require, not only by their own words', async () => {
    // The listing text need not mention the skill; the requirement does.
    const found = await list('q=kubernetes&pageSize=50');

    expect(found.total).toBeGreaterThan(1);
  });

  it('narrows results as filters are added', async () => {
    const all = await list('pageSize=50');
    const devops = await list('roles=devops&pageSize=50');
    const senior = await list('roles=devops&seniorities=senior&pageSize=50');

    expect(devops.total).toBeLessThan(all.total);
    expect(senior.total).toBeLessThanOrEqual(devops.total);
  });

  it('returns a coded 404 for a job that does not exist', async () => {
    const response = await app.inject({ method: 'GET', url: '/jobs/job-nope' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'NOT_FOUND' });
  });
});
