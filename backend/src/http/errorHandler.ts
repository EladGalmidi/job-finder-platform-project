import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

import { ApiError, type ApiErrorBody } from './errors.js';

/**
 * Turns a Zod failure into the per-field map the frontend's forms render.
 *
 * Field names are the request's own, so the UI can attach each message to the
 * input that produced it.
 */
const detailsFromZod = (error: ZodError): Record<string, string> => {
  const details: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path.join('.');
    // First message per field wins; a form shows one error per input, and the
    // first is the most specific in Zod's ordering.
    details[field] ??= issue.message;
  }

  return details;
};

/**
 * The single place a failure becomes a response.
 *
 * Two rules hold here, and both matter more than they look:
 *
 * - Every response carries a machine-readable `code`. The UI branches on it and
 *   never reads the message, so an uncoded failure is an unhandleable one.
 * - Nothing unexpected reaches the client. An unrecognised throw is logged in
 *   full and answered with a bare SERVER_ERROR, because internal messages leak
 *   query fragments, paths and library internals.
 */
export const registerErrorHandler = (app: FastifyInstance): void => {
  app.setErrorHandler((error: unknown, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ApiError) {
      // Expected failures are logged at warn: they are the system working, not
      // breaking, and logging them as errors buries the real ones.
      request.log.warn(
        { code: error.code, status: error.status, route: request.url },
        error.message,
      );
      return reply.status(error.status).send(error.toBody());
    }

    if (error instanceof ZodError) {
      const body: ApiErrorBody = {
        code: 'VALIDATION_FAILED',
        message: 'The request was not valid',
        details: detailsFromZod(error),
      };
      request.log.warn({ route: request.url, details: body.details }, 'request failed validation');
      return reply.status(422).send(body);
    }

    /*
     * Failures raised by Fastify itself and by plugins, before any handler
     * runs: a malformed body, an oversized upload, a tripped rate limit.
     *
     * These carry a status but not one of our codes, so they are mapped here.
     * Leaving the mapping incomplete is not a cosmetic bug: an unmapped client
     * error fell through to 500, which told the caller the server had broken
     * when it had in fact refused them on purpose — and the UI branches on the
     * code, so it could not react correctly either. The rate limiter's 429
     * reached users as SERVER_ERROR for exactly this reason.
     */
    const status = typeof (error as { statusCode?: number }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : 500;

    const FROM_STATUS: Readonly<Record<number, ApiErrorBody>> = {
      400: { code: 'VALIDATION_FAILED', message: 'The request was not valid' },
      401: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      403: { code: 'FORBIDDEN', message: 'You do not have access to that' },
      404: { code: 'NOT_FOUND', message: 'That was not found' },
      409: { code: 'CONFLICT', message: 'That conflicts with something that already exists' },
      413: { code: 'FILE_TOO_LARGE', message: 'That file is too large' },
      415: { code: 'UNSUPPORTED_FILE_TYPE', message: 'That file type is not supported' },
      422: { code: 'VALIDATION_FAILED', message: 'The request was not valid' },
      429: { code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.' },
    };

    const mapped = FROM_STATUS[status];
    if (mapped !== undefined) {
      // Logged at warn: the system refusing a request is it working, not failing.
      request.log.warn({ status, route: request.url }, mapped.code);
      return reply.status(status).send(mapped);
    }

    request.log.error({ err: error, route: request.url }, 'unhandled error');

    return reply.status(500).send({
      code: 'SERVER_ERROR',
      message: 'The server ran into a problem',
    } satisfies ApiErrorBody);
  });

  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) =>
    reply.status(404).send({
      code: 'NOT_FOUND',
      message: `No route for ${request.method} ${request.url}`,
    } satisfies ApiErrorBody),
  );
};
