import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/*
 * Enumerations mirror the string unions in the frontend's src/types/common.ts.
 *
 * They are real Postgres enums rather than free text so the database rejects a
 * value the application would not understand. The cost is that adding a member
 * needs a migration — which is the point: a new seniority level should be a
 * deliberate change on both sides, not a typo that lands silently in a row.
 */
export const seniorityEnum = pgEnum('seniority', ['junior', 'mid', 'senior', 'lead', 'principal']);

export const jobTypeEnum = pgEnum('job_type', [
  'fullTime',
  'partTime',
  'contract',
  'student',
  'internship',
]);

export const remoteModeEnum = pgEnum('remote_mode', ['onsite', 'hybrid', 'remote']);

export const roleKeyEnum = pgEnum('role_key', [
  'devops',
  'backend',
  'frontend',
  'fullstack',
  'productManager',
  'data',
  'sales',
]);

export const authProviderEnum = pgEnum('auth_provider', ['email', 'google', 'linkedin']);

export const jobSourceEnum = pgEnum('job_source', [
  'linkedin',
  'comeet',
  'greenhouse',
  'company',
]);

export const contentLanguageEnum = pgEnum('content_language', ['en', 'he']);

export const skillCategoryEnum = pgEnum('skill_category', [
  'language',
  'framework',
  'cloud',
  'tool',
  'soft',
  'methodology',
]);

export const skillLevelEnum = pgEnum('skill_level', ['basic', 'proficient', 'expert']);

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    fullName: text('full_name').notNull(),
    email: text('email').notNull(),

    /*
     * Null for accounts created through Google or LinkedIn, which have no
     * password of ours to verify. Nullable rather than a placeholder hash so
     * "this account cannot log in with a password" is a state the schema can
     * express, instead of something the login code has to infer.
     */
    passwordHash: text('password_hash'),

    provider: authProviderEnum('provider').notNull().default('email'),
    avatarUrl: text('avatar_url'),
    headline: text('headline'),

    /** Read and written whole by the UI, so it is stored whole. */
    preferences: jsonb('preferences'),

    onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
    activeCvId: text('active_cv_id'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    /*
     * Indexed on lower(email), so Alex@example.com and alex@example.com cannot
     * both register. A plain unique index would let both in, since they differ
     * as strings.
     *
     * Enforced by the database rather than by a lookup before insert, because
     * two concurrent signups both pass an application-level check and both
     * insert. Only a constraint holds under a race.
     */
    uniqueIndex('users_email_lower_unique').on(sql`lower(${table.email})`),
  ],
);

/**
 * Refresh tokens, one row per issued token.
 *
 * Stored as a hash, never the token itself: a leaked database backup should not
 * hand over working sessions. Rotation inserts a new row and marks the old one
 * replaced, which is what makes reuse of an already-spent token detectable —
 * the signal that a token was stolen.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    tokenHash: text('token_hash').notNull(),

    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedById: text('replaced_by_id'),

    userAgent: text('user_agent'),
    ip: text('ip'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('sessions_token_hash_unique').on(table.tokenHash),
    index('sessions_user_id_idx').on(table.userId),
  ],
);

export const companies = pgTable('companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /** Two-letter monogram rendered in place of a logo image. */
  logoText: text('logo_text').notNull(),
  logoColor: text('logo_color').notNull(),
  industry: text('industry').notNull(),
  sizeRange: text('size_range').notNull(),
  website: text('website').notNull(),
});

export const skills = pgTable('skills', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: skillCategoryEnum('category').notNull(),
  /** Alternate spellings, used when detecting a skill in CV text. */
  aliases: text('aliases').array().notNull().default([]),
});

export const jobs = pgTable(
  'jobs',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    roleKey: roleKeyEnum('role_key').notNull(),

    companyId: text('company_id')
      .notNull()
      .references(() => companies.id),

    location: text('location').notNull(),
    remoteMode: remoteModeEnum('remote_mode').notNull(),
    jobType: jobTypeEnum('job_type').notNull(),
    seniority: seniorityEnum('seniority').notNull(),

    /*
     * Flattened out of the SalaryRange object because the jobs list filters and
     * sorts on it. Inside jsonb every salary comparison becomes an unindexable
     * expression over every row.
     */
    salaryMin: integer('salary_min'),
    salaryMax: integer('salary_max'),
    salaryCurrency: text('salary_currency'),
    salaryPeriod: text('salary_period'),

    summary: text('summary').notNull(),
    description: text('description').notNull(),

    // Displayed as lists and never queried, so native arrays are enough.
    responsibilities: text('responsibilities').array().notNull().default([]),
    requirements: text('requirements').array().notNull().default([]),
    niceToHave: text('nice_to_have').array().notNull().default([]),

    postedAt: timestamp('posted_at', { withTimezone: true }).notNull(),
    source: jobSourceEnum('source').notNull(),
    externalUrl: text('external_url').notNull(),
    isPromoted: boolean('is_promoted').notNull().default(false),
    applicantsCount: integer('applicants_count').notNull().default(0),

    /** The language of the listing, independent of the reader's locale. */
    contentLanguage: contentLanguageEnum('content_language').notNull().default('en'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // The jobs list sorts by recency and filters on these four columns; without
    // indexes every page becomes a sequential scan once the table is real.
    index('jobs_posted_at_idx').on(table.postedAt),
    index('jobs_role_key_idx').on(table.roleKey),
    index('jobs_seniority_idx').on(table.seniority),
    index('jobs_remote_mode_idx').on(table.remoteMode),
  ],
);

/**
 * A job's required skills.
 *
 * A join table rather than a jsonb array so "which jobs need Kubernetes" is an
 * indexed lookup. That query is the core of matching, and it is the one the
 * mock could afford to do in memory and a real server cannot.
 */
export const jobSkills = pgTable(
  'job_skills',
  {
    jobId: text('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    skillId: text('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),

    level: skillLevelEnum('level'),
    /** Relative importance within this job's requirements, 0..1. */
    weight: real('weight'),
  },
  (table) => [
    uniqueIndex('job_skills_unique').on(table.jobId, table.skillId),
    index('job_skills_skill_id_idx').on(table.skillId),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
export type JobRow = typeof jobs.$inferSelect;
export type CompanyRow = typeof companies.$inferSelect;
export type SkillRow = typeof skills.$inferSelect;
