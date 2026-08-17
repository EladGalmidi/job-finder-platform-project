import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyInstance } from 'fastify';

import { registerAuth } from './auth/plugin.js';
import { env } from './config/env.js';
import { registerErrorHandler } from './http/errorHandler.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerCvRoutes } from './routes/cv.js';
import { registerJobRoutes } from './routes/jobs.js';

/** JSON bodies larger than this are refused before they are buffered. */
const MAX_BODY_BYTES = 1_000_000;

/** Upload ceiling, matching the frontend's MAX_CV_BYTES. */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Builds the server without starting it, so tests can drive it over
 * `app.inject()` with no port and no sockets.
 */
export const buildApp = async (): Promise<FastifyInstance> => {
  const config = env();

  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      // Structured logs throughout. Pretty-printing is a local concern and is
      // piped in by the dev script rather than compiled into the server.
      redact: {
        paths: ['req.headers.cookie', 'req.headers.authorization', 'req.body.password'],
        censor: '[redacted]',
      },
    },
    bodyLimit: MAX_BODY_BYTES,
    // Trusting the proxy is what makes req.ip the real client address behind a
    // load balancer, which the rate limiter keys on.
    trustProxy: config.NODE_ENV === 'production',
  });

  await app.register(helmet);

  /*
   * Credentialed CORS. `credentials: true` is what allows the browser to send
   * the session cookie, and it is only legal against an explicit origin — the
   * spec forbids pairing it with a wildcard, so CORS_ORIGIN is configuration
   * rather than a default.
   */
  await app.register(cors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
  });

  await app.register(cookie, {
    secret: config.SESSION_SECRET,
  });

  /*
   * File uploads. The limit is enforced while streaming, so an oversized file
   * is rejected before it is ever fully buffered in memory.
   */
  await app.register(multipart, {
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  });

  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    // Answered through the standard error shape so the UI's RATE_LIMITED branch
    // sees the same body as every other failure.
    errorResponseBuilder: () => ({
      code: 'RATE_LIMITED',
      message: 'Too many requests. Try again shortly.',
    }),
  });

  registerErrorHandler(app);
  registerAuth(app);

  registerAuthRoutes(app);
  registerJobRoutes(app);
  registerCvRoutes(app);

  // Liveness only. It deliberately does not touch the database: a health check
  // that fails when Postgres blips causes the orchestrator to kill a server
  // that was working fine. Dependency checks belong on a separate readiness
  // endpoint, added when there is an orchestrator to read it.
  app.get('/health', () => ({ status: 'ok', uptime: process.uptime() }));

  return app;
};
