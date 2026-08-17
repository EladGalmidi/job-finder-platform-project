import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { clearSessionCookie, setSessionCookie } from '../auth/cookies.js';
import { hashPassword, verifyPassword } from '../auth/passwords.js';
import { createSession, revokeSession } from '../auth/sessions.js';
import { database } from '../db/client.js';
import { users } from '../db/schema.js';
import { conflict, invalidCredentials } from '../http/errors.js';
import { toUserJson } from '../serializers/user.js';

/**
 * Password floor, matching the frontend's MIN_PASSWORD_LENGTH.
 *
 * Only a floor. Length is the property that matters, so there is deliberately
 * no rule about symbols or mixed case: those push people toward Passw0rd! and
 * away from long passphrases.
 */
const MIN_PASSWORD_LENGTH = 8;

const credentials = {
  email: z.email().max(320),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(1024),
};

const signupBody = z.object({
  fullName: z.string().trim().min(2).max(120),
  ...credentials,
});

const loginBody = z.object(credentials);

/** Stored lower-cased to match the unique index on lower(email). */
const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const registerAuthRoutes = (app: FastifyInstance): void => {
  app.post('/auth/signup', async (request, reply) => {
    const body = signupBody.parse(request.body);
    const email = normalizeEmail(body.email);
    const { db } = database();

    const passwordHash = await hashPassword(body.password);

    /*
     * The unique index is what actually decides, not a lookup beforehand. Two
     * simultaneous signups for one address both pass a check-then-insert, and
     * only the constraint stops the second.
     */
    const inserted = await db
      .insert(users)
      .values({
        id: randomUUID(),
        fullName: body.fullName.trim(),
        email,
        passwordHash,
        provider: 'email',
      })
      .onConflictDoNothing()
      .returning();

    const user = inserted[0];
    if (user === undefined) {
      throw conflict('That email address is already registered');
    }

    const session = await createSession(db, user.id, {
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    });

    setSessionCookie(reply, session.token, session.expiresAt);

    return reply.status(201).send({ user: toUserJson(user) });
  });

  app.post('/auth/login', async (request, reply) => {
    const body = loginBody.parse(request.body);
    const { db } = database();

    const found = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${normalizeEmail(body.email)}`)
      .limit(1);

    const user = found[0];

    /*
     * A missing account still costs a password verification.
     *
     * Returning early would make "no such user" measurably faster than "wrong
     * password", which turns login timing into an account-existence oracle.
     * The dummy hash below is a real hash of a random value, so the work done
     * is the same either way.
     */
    const stored = user?.passwordHash ?? (await timingDecoyHash());
    const ok = await verifyPassword(body.password, stored);

    // A null hash means a social account, which has no password of ours to
    // check — it must not fall through to a successful login.
    if (!ok || user?.passwordHash == null) {
      throw invalidCredentials();
    }

    const session = await createSession(db, user.id, {
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    });

    setSessionCookie(reply, session.token, session.expiresAt);

    return reply.send({ user: toUserJson(user) });
  });

  app.post('/auth/logout', async (request, reply) => {
    if (request.sessionToken !== null) {
      await revokeSession(database().db, request.sessionToken);
    }

    // Cleared unconditionally: logging out with an already-dead session must
    // still leave the browser without a cookie.
    clearSessionCookie(reply);

    return reply.send({ ok: true });
  });

  app.get('/auth/me', (request) => {
    return { ...toUserJson(request.requireUser()) };
  });

  app.patch('/users/me', async (request) => {
    const user = request.requireUser();
    const body = z
      .object({
        fullName: z.string().trim().min(2).max(120).optional(),
        headline: z.string().trim().max(200).nullable().optional(),
      })
      .parse(request.body);

    const updated = await database()
      .db.update(users)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();

    return toUserJson(updated[0] ?? user);
  });
};

/**
 * A real hash of a random value, used to keep login timing constant when the
 * account does not exist.
 *
 * Derived from randomness rather than a literal, so it can never match a
 * password someone actually chooses. Computed once, on the first login rather
 * than at import, so loading this module does not block on a deliberately slow
 * hash.
 */
let dummyHash: Promise<string> | undefined;

const timingDecoyHash = (): Promise<string> => {
  dummyHash ??= hashPassword(randomUUID());
  return dummyHash;
};
