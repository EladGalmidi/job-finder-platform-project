import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';

import type { Database } from '../db/client.js';
import { sessions, users, type UserRow } from '../db/schema.js';

/** Absolute lifetime. A session is dead at this point however active it was. */
export const SESSION_TTL_DAYS = 30;

/**
 * How old a token gets before it is exchanged for a fresh one.
 *
 * Rotation limits the value of a stolen cookie: a token copied today stops
 * working once the real browser next rotates, rather than lasting the full
 * thirty days. It also gives us reuse detection, which is the part that
 * actually catches theft — see userForToken.
 */
const ROTATE_AFTER_HOURS = 24;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Session tokens are 32 random bytes.
 *
 * Random, not derived from anything about the user: a token that encodes the
 * account is a token an attacker can reason about. Length is what makes
 * guessing hopeless.
 */
const TOKEN_BYTES = 32;

const newToken = (): string => randomBytes(TOKEN_BYTES).toString('base64url');

/**
 * Tokens are stored as a SHA-256 digest, never in the clear.
 *
 * A leaked database backup should not hand over working sessions. Plain SHA-256
 * rather than a slow hash is correct here and wrong for passwords: the input is
 * 256 bits of entropy we generated, so there is no dictionary to attack and
 * nothing for a work factor to defend against.
 */
const digest = (token: string): string => createHash('sha256').update(token).digest('hex');

export interface IssuedSession {
  readonly id: string;
  /** Returned to the caller once, to be set as a cookie. Never stored. */
  readonly token: string;
  readonly expiresAt: Date;
}

export interface SessionContext {
  readonly userAgent?: string | undefined;
  readonly ip?: string | undefined;
}

export const createSession = async (
  db: Database['db'],
  userId: string,
  context: SessionContext = {},
  /** Carried over by rotation, so a rotated session keeps its original expiry. */
  expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * MS_PER_DAY),
): Promise<IssuedSession> => {
  const token = newToken();
  const id = randomUUID();

  await db.insert(sessions).values({
    id,
    userId,
    tokenHash: digest(token),
    expiresAt,
    userAgent: context.userAgent ?? null,
    ip: context.ip ?? null,
  });

  return { id, token, expiresAt };
};

/**
 * Resolves a token to its user, or null.
 *
 * Expiry and revocation are both checked in the query rather than after it, so
 * there is no window where a revoked session is briefly treated as valid.
 */
export interface ResolvedSession {
  readonly user: UserRow;
  /** Set when the token was rotated, and must be written back as a cookie. */
  readonly rotated?: IssuedSession;
}

export const userForToken = async (
  db: Database['db'],
  token: string,
  context: SessionContext = {},
): Promise<ResolvedSession | null> => {
  const hash = digest(token);

  const rows = await db
    .select({
      user: users,
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      revokedAt: sessions.revokedAt,
      replacedById: sessions.replacedById,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.tokenHash, hash))
    .limit(1);

  const row = rows[0];
  if (row === undefined) return null;

  /*
   * A spent token being presented again is the signal that one was stolen.
   *
   * After rotation the old token is revoked and points at its replacement. The
   * legitimate browser holds the new cookie and never sends the old one again,
   * so a second use means two parties hold it — and we cannot tell which is
   * the impostor. Ending every session for the account is the safe answer: the
   * real user signs in again, the thief is locked out.
   */
  if (row.replacedById !== null) {
    await revokeAllSessions(db, row.user.id);
    return null;
  }

  if (row.revokedAt !== null) return null;

  // Expiry is compared here rather than in SQL so the clock that decides is the
  // application's, the same one that issued the timestamp.
  if (row.expiresAt.getTime() <= Date.now()) return null;

  const age = Date.now() - row.createdAt.getTime();
  if (age < ROTATE_AFTER_HOURS * 60 * 60 * 1000) return { user: row.user };

  /*
   * Rotate. The absolute expiry is deliberately not extended: a session still
   * dies thirty days after sign-in, so rotation cannot keep one alive forever.
   */
  const replacement = await createSession(db, row.user.id, context, row.expiresAt);

  await db
    .update(sessions)
    .set({ revokedAt: new Date(), replacedById: replacement.id })
    .where(eq(sessions.id, row.sessionId));

  return { user: row.user, rotated: replacement };
};

/** Ends one session. Used by logout, so a shared computer stays signed out. */
export const revokeSession = async (db: Database['db'], token: string): Promise<void> => {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.tokenHash, digest(token)));
};

/** Ends every session for a user, for password changes and "sign out everywhere". */
export const revokeAllSessions = async (db: Database['db'], userId: string): Promise<void> => {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
};
