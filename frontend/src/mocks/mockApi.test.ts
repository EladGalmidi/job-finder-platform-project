import { beforeEach, describe, expect, it } from 'vitest';

import { applicationsApi } from '@/services/api/applicationsApi';
import { authApi } from '@/services/api/authApi';
import { cvApi } from '@/services/api/cvApi';
import { insightsApi } from '@/services/api/insightsApi';
import { jobsApi } from '@/services/api/jobsApi';
import { ApiError, asCvId, asJobId, type JobQuery } from '@/types';

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

/*
 * No token is stored here any more. The mock's auth handler records its own
 * session when login succeeds, standing in for the httpOnly cookie the real
 * server sets — which the client equally cannot see or persist itself.
 */
const signIn = async (): Promise<void> => {
  await authApi.login({ email: 'demo@jobmatch.ai', password: 'demo1234' });
};

/** A fresh account, which owns none of the seeded demo data. */
const signUpNewUser = async (): Promise<void> => {
  await authApi.signup({
    fullName: 'Dana Levi',
    email: 'dana@example.com',
    password: 'Str0ngPass!23',
  });
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

  it('distinguishes bad credentials from an expired session', async () => {
    // INVALID_CREDENTIALS rather than UNAUTHORIZED: the login form needs copy
    // about the password being wrong, not about the session having expired.
    await expect(
      authApi.login({ email: 'demo@jobmatch.ai', password: 'wrongpass' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
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

  it('scopes alerts and activity to the signed-in account', async () => {
    // The feeds used to be global: a brand-new account saw the demo user's
    // history on its dashboard while its own metrics correctly read zero.
    await signIn();
    expect((await insightsApi.alerts()).length).toBeGreaterThan(0);
    expect((await insightsApi.activity()).length).toBeGreaterThan(0);

    await signUpNewUser();
    expect(await insightsApi.alerts()).toHaveLength(0);
    expect(await insightsApi.activity()).toHaveLength(0);
  });

  it('will not serve a CV analysis to an account that does not own it', async () => {
    await signIn();
    const cv = await cvApi.active();
    expect(cv).not.toBeNull();

    await signUpNewUser();
    await expect(cvApi.analysis(cv?.id ?? asCvId('cv-demo'))).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('ranks missing skills by demand, as both surfaces claim', async () => {
    await signIn();
    const cv = await cvApi.active();
    const analysis = await cvApi.analysis(cv?.id ?? asCvId('cv-demo'));

    const demand = analysis.missingSkills.map((skill) => skill.demandPercent);
    expect(demand).toEqual([...demand].sort((left, right) => right - left));
  });

  it('scores the job type the user asked for', async () => {
    // jobTypes was a required onboarding field that fed nothing.
    await signIn();
    const page = await jobsApi.list(baseQuery);
    const reasons = page.items.flatMap((item) => item.match?.reasons ?? []);
    expect(reasons.some((reason) => reason.kind === 'jobType')).toBe(true);
  });
});
