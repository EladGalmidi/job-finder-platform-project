import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { __setEnv, loadEnv } from '../config/env.js';
import { closeDatabase, createDatabase, type Database } from '../db/client.js';
import { hashPassword } from './passwords.js';
import { createSession, revokeSession, userForToken } from './sessions.js';
import { users } from '../db/schema.js';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { sessions } from '../db/schema.js';

const testEnv = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL:
    process.env['DATABASE_URL'] ?? 'postgres://jobmatch:jobmatch@localhost:5433/jobmatch',
  SESSION_SECRET: 'a-test-secret-that-is-long-enough-to-pass',
  LOG_LEVEL: 'fatal',
});

const reachable = await (async (): Promise<boolean> => {
  const { sql: probe } = createDatabase(testEnv.DATABASE_URL, 1);
  try {
    await probe`select 1`;
    return true;
  } catch {
    return false;
  } finally {
    await probe.end();
  }
})();

describe.skipIf(!reachable)('session rotation', () => {
  let handle: Database;
  let db: Database['db'];
  let userId: string;

  beforeAll(async () => {
    __setEnv(testEnv);
    handle = createDatabase(testEnv.DATABASE_URL, 2);
    db = handle.db;

    userId = randomUUID();
    await db.insert(users).values({
      id: userId,
      fullName: 'Rotation Tester',
      email: `rotate+${String(Date.now())}@example.com`,
      passwordHash: await hashPassword('a-long-enough-password'),
    });
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
    await handle.sql.end();
    await closeDatabase();
    __setEnv(undefined);
  });

  /** Ages a session so the next resolve crosses the rotation threshold. */
  const age = (id: string, hours: number) =>
    db
      .update(sessions)
      .set({ createdAt: sql`now() - interval '${sql.raw(String(hours))} hours'` })
      .where(eq(sessions.id, id));

  it('does not rotate a fresh token', async () => {
    const issued = await createSession(db, userId);
    const resolved = await userForToken(db, issued.token);

    expect(resolved?.user.id).toBe(userId);
    // Rotating on every request would churn cookies for no security gain.
    expect(resolved?.rotated).toBeUndefined();
  });

  it('rotates a token past the threshold and keeps the original expiry', async () => {
    const issued = await createSession(db, userId);
    await age(issued.id, 48);

    const resolved = await userForToken(db, issued.token);

    expect(resolved?.rotated).toBeDefined();
    expect(resolved?.rotated?.token).not.toBe(issued.token);
    // Rotation must not extend the absolute lifetime, or a session never dies.
    expect(resolved?.rotated?.expiresAt.getTime()).toBe(issued.expiresAt.getTime());
  });

  it('kills every session when a spent token is presented again', async () => {
    const first = await createSession(db, userId);
    const other = await createSession(db, userId);
    await age(first.id, 48);

    const rotated = await userForToken(db, first.token);
    const replacement = rotated?.rotated?.token ?? '';

    expect(await userForToken(db, replacement)).not.toBeNull();

    /*
     * The old token turning up again means two parties hold it. We cannot tell
     * which is the impostor, so every session for the account ends.
     */
    expect(await userForToken(db, first.token)).toBeNull();
    expect(await userForToken(db, replacement)).toBeNull();
    expect(await userForToken(db, other.token)).toBeNull();
  });

  it('refuses a revoked token', async () => {
    const issued = await createSession(db, userId);
    await revokeSession(db, issued.token);

    expect(await userForToken(db, issued.token)).toBeNull();
  });

  it('refuses an expired token', async () => {
    const issued = await createSession(db, userId, {}, new Date(Date.now() - 1000));

    expect(await userForToken(db, issued.token)).toBeNull();
  });

  it('refuses a token that was never issued', async () => {
    expect(await userForToken(db, 'not-a-real-token')).toBeNull();
  });
});
