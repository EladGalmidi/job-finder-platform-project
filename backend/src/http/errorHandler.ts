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

    // Fastify's own errors for malformed bodies and payloads too large, which
    // arrive before any handler runs.
    const status = typeof (error as { statusCode?: number }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : 500;

    if (status === 413) {
      return reply
        .status(413)
        .send({ code: 'FILE_TOO_LARGE', message: 'That file is too large' } satisfies ApiErrorBody);
    }

    if (status === 400) {
      return reply
        .status(400)
        .send({ code: 'VALIDATION_FAILED', message: 'The request was not valid' } satisfies ApiErrorBody);
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
