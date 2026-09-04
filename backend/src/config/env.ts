import { z } from 'zod';

/**
 * Every environment variable the server reads, validated once at startup.
 *
 * Reading process.env directly anywhere else is what lets a typo become a
 * runtime failure hours later, under load, in production. Parsing here means a
 * misconfigured server refuses to start instead of half-working.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('127.0.0.1'),

  DATABASE_URL: z.url(),

  /*
   * Session cookies are signed with this. Thirty-two characters is the floor
   * rather than a suggestion: a short secret is a forgeable session, and the
   * only safe time to catch that is before the server accepts a request.
   */
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

  /** Origin allowed to send credentialed requests. The frontend's dev server. */
  CORS_ORIGIN: z.url().default('http://localhost:5173'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  /*
   * Credential for the Gemini API.
   *
   * Rejected when present but blank, because an empty string is a
   * misconfiguration that would otherwise surface as a confusing 401 from the
   * model rather than as a startup failure.
   *
   * Optional rather than required only because nothing in the running server
   * calls Gemini yet — a standalone script does. Making it mandatory here would
   * stop the API booting, and every test and CI run, over a credential none of
   * them use. It should become required in the same change that puts Gemini on
   * a real request path.
   */
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY must not be empty').optional(),
});

export type Env = Readonly<z.infer<typeof schema>>;

let cached: Env | undefined;

export const loadEnv = (source: NodeJS.ProcessEnv = process.env): Env => {
  const parsed = schema.safeParse(source);

  if (!parsed.success) {
    // Printed rather than thrown as a stack trace: the reader needs to know
    // which variables are wrong, not where the parser lives.
    const problems = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  return Object.freeze(parsed.data);
};

/** The validated environment. Loaded once, on first use. */
export const env = (): Env => {
  cached ??= loadEnv();
  return cached;
};

/** Test seam: lets a test supply its own environment. */
export const __setEnv = (next: Env | undefined): void => {
  cached = next;
};
