import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit runs as a CLI outside the server, so it reads the environment
 * directly rather than through config/env.ts.
 */
const url = process.env['DATABASE_URL'];

if (url === undefined || url === '') {
  throw new Error('DATABASE_URL must be set. Run drizzle-kit with --env-file=.env');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
  // Every change goes through a reviewable SQL file. `push` mutates the
  // database straight from the schema, which is convenient exactly until it
  // silently drops a column in an environment that mattered.
  strict: true,
  verbose: true,
});
