import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { buildApp } from '../app.js';
import { __setEnv, loadEnv } from '../config/env.js';
import { ApiError, conflict } from './errors.js';

let app: FastifyInstance;

beforeAll(async () => {
  __setEnv(
    loadEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://jobmatch:jobmatch@localhost:5432/jobmatch',
      SESSION_SECRET: 'a-test-secret-that-is-long-enough-to-pass',
      LOG_LEVEL: 'fatal',
    }),
  );

  app = await buildApp();

  app.get('/boom/api-error', () => {
    throw conflict('That email is already registered');
  });

  app.get('/boom/zod', () => {
    z.object({ email: z.email() }).parse({ email: 'nope' });
  });

  app.get('/boom/unexpected', () => {
    throw new Error('connection string postgres://user:hunter2@db/internal');
  });

  await app.ready();
});

afterAll(async () => {
  await app.close();
  __setEnv(undefined);
});

describe('error handler', () => {
  it('serialises an ApiError with its code and status', async () => {
    const response = await app.inject({ method: 'GET', url: '/boom/api-error' });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      code: 'CONFLICT',
      message: 'That email is already registered',
    });
  });

  it('turns a Zod failure into per-field details the forms can render', async () => {
    const response = await app.inject({ method: 'GET', url: '/boom/zod' });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({
      code: 'VALIDATION_FAILED',
      details: { email: expect.any(String) as string },
    });
  });

  it('never leaks the detail of an unexpected failure', async () => {
    const response = await app.inject({ method: 'GET', url: '/boom/unexpected' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      code: 'SERVER_ERROR',
      message: 'The server ran into a problem',
    });
    // The credential in the thrown message must not reach the client.
    expect(response.body).not.toContain('hunter2');
  });

  it('answers an unknown route with a coded body, not Fastify default HTML', async () => {
    const response = await app.inject({ method: 'GET', url: '/no-such-route' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('reports liveness without touching the database', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });
  });
});

describe('ApiError', () => {
  it('omits details entirely when there are none', () => {
    expect(new ApiError('NOT_FOUND', 'gone', 404).toBody()).toEqual({
      code: 'NOT_FOUND',
      message: 'gone',
    });
  });
});
