import { beforeEach, describe, expect, it } from 'vitest';

import { STORAGE_KEYS, writeString } from '@/lib/storage';
import { applicationsApi } from '@/services/api/applicationsApi';
import { authApi } from '@/services/api/authApi';
import { jobsApi } from '@/services/api/jobsApi';
import { ApiError, asJobId, type JobQuery } from '@/types';

import { mockDb } from './db/mockDb';

const baseQuery: JobQuery = {
  q: '',
  roles: [],
  locations: [],
  remoteModes: [],
  jobTypes: [],
  seniorities: [],
  salaryMin: null,
  sort: 'relevance',
  tab: 'all',
  page: 1,
};

const signIn = async (): Promise<void> => {
  const session = await authApi.login({ email: 'demo@jobmatch.ai', password: 'demo1234' });
  writeString(STORAGE_KEYS.authToken, session.token);
};

/**
 * Contract test: exercises the service layer against the mock transport and
 * asserts the shapes the declared types promise. This is what keeps the mock
 * honest as a stand-in for the real backend.
 */
describe('mock API', () => {
  beforeEach(() => {
    mockDb.reset();
  });

  it('rejects the documented failure password with a structured error', async () => {
    await expect(
      authApi.login({ email: 'demo@jobmatch.ai', password: 'wrongpass' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
  });

  it('reports field-level validation details rather than a message string', async () => {
    await expect(authApi.login({ email: 'nope', password: 'x' })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      details: { email: 'INVALID_EMAIL', password: 'PASSWORD_TOO_SHORT' },
    });
  });

  it('returns a paginated envelope with per-row match data', async () => {
    await signIn();
    const page = await jobsApi.list({ ...baseQuery, page: 1 });

    expect(page.total).toBeGreaterThan(0);
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items[0]?.job.id).toBeDefined();
    expect(page.items[0]?.match?.score).toBeTypeOf('number');
  });

  it('sorts by relevance descending by default', async () => {
    await signIn();
    const page = await jobsApi.list(baseQuery);
    const scores = page.items.map((item) => item.match?.score ?? 0);

    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it('actually filters rather than returning everything', async () => {
    await signIn();
    const all = await jobsApi.list(baseQuery);
    const devops = await jobsApi.list({ ...baseQuery, roles: ['devops'] });

    expect(devops.total).toBeLessThan(all.total);
    expect(devops.items.every((item) => item.job.roleKey === 'devops')).toBe(true);
  });

  it('produces an empty result set for a term that matches nothing', async () => {
    await signIn();
    const page = await jobsApi.list({ ...baseQuery, q: 'zzzzz-no-such-role' });

    expect(page.items).toHaveLength(0);
    expect(page.total).toBe(0);
  });

  it('scores deterministically across calls', async () => {
    await signIn();
    const first = await jobsApi.list(baseQuery);
    const second = await jobsApi.list(baseQuery);

    expect(first.items.map((item) => item.match?.score)).toEqual(
      second.items.map((item) => item.match?.score),
    );
  });

  it('promotes an existing saved job instead of creating a duplicate', async () => {
    await signIn();
    const jobId = asJobId('job-005');

    const saved = await applicationsApi.create(jobId, 'saved');
    expect(saved.status).toBe('saved');

    const applied = await applicationsApi.create(jobId, 'applied');
    expect(applied.id).toBe(saved.id);
    expect(applied.status).toBe('applied');
    expect(applied.timeline).toHaveLength(2);
  });

  it('requires a session for protected endpoints', async () => {
    localStorage.clear();
    await expect(jobsApi.detail(asJobId('job-001'))).resolves.toBeDefined();
    await expect(applicationsApi.list({ q: '', statuses: [], sort: 'recent' })).rejects.toBeInstanceOf(
      ApiError,
    );
  });

  it('returns NOT_FOUND for an unknown job', async () => {
    await expect(jobsApi.detail(asJobId('job-does-not-exist'))).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });
});
