import type { UserRow } from '../db/schema.js';

/**
 * The User shape the frontend's src/types/user.ts declares.
 *
 * Written out rather than inferred from the table, because the two are allowed
 * to differ and must: password_hash and updated_at exist in the row and must
 * never reach a client. Serialising explicitly means adding a column cannot
 * silently start publishing it.
 */
export interface UserJson {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly avatarUrl: string | null;
  readonly headline: string | null;
  readonly provider: 'email' | 'google' | 'linkedin';
  readonly createdAt: string;
  readonly onboardingCompletedAt: string | null;
  readonly preferences: unknown;
  readonly activeCvId: string | null;
}

export const toUserJson = (row: UserRow): UserJson => ({
  id: row.id,
  fullName: row.fullName,
  email: row.email,
  avatarUrl: row.avatarUrl,
  headline: row.headline,
  provider: row.provider,
  // The frontend types these as ISODateTime strings, and JSON has no date type.
  createdAt: row.createdAt.toISOString(),
  onboardingCompletedAt: row.onboardingCompletedAt?.toISOString() ?? null,
  preferences: row.preferences ?? null,
  activeCvId: row.activeCvId,
});
