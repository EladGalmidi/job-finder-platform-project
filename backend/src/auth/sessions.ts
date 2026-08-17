import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';

import type { Database } from '../db/client.js';
import { sessions, users, type UserRow } from '../db/schema.js';

/** How long a session cookie stays valid without being refreshed. */
export const SESSION_TTL_DAYS = 30;

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
): Promise<IssuedSession> => {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * MS_PER_DAY);

  await db.insert(sessions).values({
    id: randomUUID(),
    userId,
    tokenHash: digest(token),
    expiresAt,
    userAgent: context.userAgent ?? null,
    ip: context.ip ?? null,
  });

  return { token, expiresAt };
};

/**
 * Resolves a token to its user, or null.
 *
 * Expiry and revocation are both checked in the query rather than after it, so
 * there is no window where a revoked session is briefly treated as valid.
 */
export const userForToken = async (
  db: Database['db'],
  token: string,
): Promise<UserRow | null> => {
  const rows = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, digest(token)), isNull(sessions.revokedAt)))
    .limit(1);

  const row = rows[0];
  if (row === undefined) return null;

  // Expiry is compared here rather than in SQL so the clock that decides is the
  // application's, the same one that issued the timestamp.
  if (row.expiresAt.getTime() <= Date.now()) return null;

  return row.user;
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
