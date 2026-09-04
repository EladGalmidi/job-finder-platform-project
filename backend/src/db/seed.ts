import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { env } from '../config/env.js';
import { createDatabase } from './client.js';
import { companies, jobSkills, jobs, skills } from './schema.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const seedDir = join(dirname(fileURLToPath(import.meta.url)), '../../seed');

/*
 * The snapshot is validated before a single row is written.
 *
 * Without this, a fixture that has drifted from the schema fails deep inside a
 * bulk insert with a Postgres type error naming a column and no record. Parsing
 * first turns that into "jobs[7].seniority: invalid value" before the
 * transaction opens.
 */
const companySchema = z.object({
  id: z.string(),
  name: z.string(),
  logoText: z.string(),
  logoColor: z.string(),
  industry: z.string(),
  sizeRange: z.string(),
  website: z.string(),
});

const skillSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['language', 'framework', 'cloud', 'tool', 'soft', 'methodology']),
  aliases: z.array(z.string()).default([]),
});

const jobSchema = z.object({
  id: z.string(),
  title: z.string(),
  roleKey: z.enum([
    'devops',
    'backend',
    'frontend',
    'fullstack',
    'productManager',
    'data',
    'sales',
  ]),
  companyId: z.string(),
  location: z.string(),
  remoteMode: z.enum(['onsite', 'hybrid', 'remote']),
  jobType: z.enum(['fullTime', 'partTime', 'contract', 'student', 'internship']),
  seniority: z.enum(['junior', 'mid', 'senior', 'lead', 'principal']),
  salary: z
    .object({
      min: z.number(),
      max: z.number(),
      currency: z.string(),
      period: z.string(),
    })
    .nullable(),
  summary: z.string(),
  description: z.string(),
  responsibilities: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  niceToHave: z.array(z.string()).default([]),
  requiredSkills: z
    .array(
      z.object({
        skillId: z.string(),
        level: z.enum(['basic', 'proficient', 'expert']).optional(),
        weight: z.number().optional(),
      }),
    )
    .default([]),
  postedDaysAgo: z.number().int().nonnegative(),
  source: z.enum(['linkedin', 'comeet', 'greenhouse', 'company']),
  externalUrl: z.string(),
  isPromoted: z.boolean().default(false),
  applicantsCount: z.number().int().nonnegative().default(0),
  contentLanguage: z.enum(['en', 'he']).default('en'),
});

const read = <T>(file: string, schema: z.ZodType<T>): T[] => {
  const raw: unknown = JSON.parse(readFileSync(join(seedDir, file), 'utf8'));
  return z.array(schema).parse(raw);
};

const run = async (): Promise<void> => {
  const companyRows = read('companies.json', companySchema);
  const skillRows = read('skills.json', skillSchema);
  const jobRows = read('jobs.json', jobSchema);

  /*
   * Referential integrity is checked here rather than left to the foreign key.
   * A constraint violation names the constraint; this names the job and the
   * skill, which is what someone actually needs to fix the fixture.
   */
  const knownSkills = new Set(skillRows.map((skill) => skill.id));
  const knownCompanies = new Set(companyRows.map((company) => company.id));

  for (const job of jobRows) {
    if (!knownCompanies.has(job.companyId)) {
      throw new Error(`Job ${job.id} references unknown company ${job.companyId}`);
    }
    for (const required of job.requiredSkills) {
      if (!knownSkills.has(required.skillId)) {
        throw new Error(`Job ${job.id} references unknown skill ${required.skillId}`);
      }
    }
  }

  const now = Date.now();
  const { db, sql } = createDatabase(env().DATABASE_URL, 1);

  try {
    // One transaction: a seed that fails halfway leaves jobs without the
    // companies they point at, which is worse than not having seeded at all.
    await db.transaction(async (tx) => {
      for (const company of companyRows) {
        await tx
          .insert(companies)
          .values(company)
          .onConflictDoUpdate({ target: companies.id, set: company });
      }

      for (const skill of skillRows) {
        await tx
          .insert(skills)
          .values(skill)
          .onConflictDoUpdate({ target: skills.id, set: skill });
      }

      for (const job of jobRows) {
        const { requiredSkills, postedDaysAgo, salary, ...rest } = job;

        const row = {
          ...rest,
          postedAt: new Date(now - postedDaysAgo * MS_PER_DAY),
          salaryMin: salary?.min ?? null,
          salaryMax: salary?.max ?? null,
          salaryCurrency: salary?.currency ?? null,
          salaryPeriod: salary?.period ?? null,
        };

        await tx.insert(jobs).values(row).onConflictDoUpdate({ target: jobs.id, set: row });

        // Replaced wholesale rather than merged: a skill removed from a listing
        // has to disappear, and an upsert alone would leave it behind forever.
        await tx.delete(jobSkills).where(eq(jobSkills.jobId, job.id));

        if (requiredSkills.length > 0) {
          await tx.insert(jobSkills).values(
            requiredSkills.map((required) => ({
              jobId: job.id,
              skillId: required.skillId,
              level: required.level ?? null,
              weight: required.weight ?? null,
            })),
          );
        }
      }
    });

    console.log(
      `Seeded ${String(companyRows.length)} companies, ${String(skillRows.length)} skills, ${String(jobRows.length)} jobs.`,
    );
  } finally {
    await sql.end();
  }
};

run().catch((error: unknown) => {
  console.error('Seed failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
