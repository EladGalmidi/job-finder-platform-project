import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { env } from '../config/env.js';
import { createDatabase } from './client.js';

/**
 * Applies pending migrations and exits.
 *
 * Runs as its own command rather than on server startup: several server
 * instances booting at once would each try to migrate, and a migration that
 * fails should stop a deploy rather than leave a process serving against a
 * half-changed schema.
 */
const run = async (): Promise<void> => {
  // A single connection — migrations are strictly sequential, and a pool here
  // only risks advisory-lock contention with itself.
  const { db, sql } = createDatabase(env().DATABASE_URL, 1);

  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migrations applied.');
  } finally {
    await sql.end();
  }
};

run().catch((error: unknown) => {
  console.error('Migration failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
