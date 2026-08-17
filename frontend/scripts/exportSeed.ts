import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { COMPANIES } from '@/mocks/data/companies';
import { JOBS } from '@/mocks/data/jobs';
import { SKILLS } from '@/mocks/data/skills';

/**
 * Writes the demo fixtures out as JSON for the backend to seed from.
 *
 * The backend cannot import these modules directly: they resolve through Vite's
 * `@/` alias, pull in browser-oriented helpers, and compute their dates at
 * import time. Exporting a snapshot keeps the two packages independent — the
 * backend reads plain JSON and knows nothing about the frontend's build setup.
 *
 * This is a one-way export. Once real listings arrive from a real source, the
 * snapshot stops being regenerated and this script goes away.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const outputDir = join(dirname(fileURLToPath(import.meta.url)), '../../backend/seed');

/**
 * Jobs are stored as an age in days rather than a fixed timestamp.
 *
 * `postedAt` is computed as "N days ago" when the fixture module loads, so
 * freezing the resolved instant would leave every listing looking progressively
 * more stale the longer it is since this ran. Keeping the offset lets the seed
 * rebuild dates relative to whenever it is applied.
 */
const ageInDays = (postedAt: string): number => {
  const age = (Date.now() - new Date(postedAt).getTime()) / MS_PER_DAY;
  return Math.max(0, Math.round(age));
};

const jobs = JOBS.map(({ company, postedAt, salary, ...rest }) => ({
  ...rest,
  companyId: company.id,
  postedDaysAgo: ageInDays(postedAt),
  salary,
}));

mkdirSync(outputDir, { recursive: true });

const write = (name: string, data: unknown): void => {
  const path = join(outputDir, name);
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`wrote ${name} (${String(Array.isArray(data) ? data.length : 0)} records)`);
};

write('companies.json', COMPANIES);
write('skills.json', SKILLS);
write('jobs.json', jobs);
