import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '../config/env.js';
import * as schema from './schema.js';

export type Database = ReturnType<typeof createDatabase>;

/**
 * Opens a pooled connection.
 *
 * `max` is deliberately small. Postgres handles a modest number of busy
 * connections far better than a large number of mostly-idle ones, and every
 * process in a deployment multiplies this number against the server's limit.
 */
export const createDatabase = (connectionString: string, max = 10) => {
  const sql = postgres(connectionString, {
    max,
    // Fail rather than queue forever when the pool is exhausted; a request that
    // hangs on a connection is indistinguishable to the user from a dead server.
    connect_timeout: 10,
  });

  return { db: drizzle(sql, { schema }), sql };
};

let instance: Database | undefined;

/** The shared connection, opened on first use. */
export const database = (): Database => {
  instance ??= createDatabase(env().DATABASE_URL);
  return instance;
};

export const closeDatabase = async (): Promise<void> => {
  if (instance === undefined) return;
  await instance.sql.end();
  instance = undefined;
};
