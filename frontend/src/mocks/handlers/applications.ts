import { nowIso } from '@/lib/dates';
import { ApiError, asActivityId, asApplicationId, asJobId, asUserId } from '@/types';
import type { Activity, Application, ApplicationStatus } from '@/types';

import { JOBS } from '../data/jobs';
import { mockDb } from '../db/mockDb';
import type { HandlerContext, MockRoute } from '../transport/router';

const requireUserId = (context: HandlerContext): string => {
  if (context.userId === null) {
    throw new ApiError('UNAUTHORIZED', 'Not signed in', 401);
  }
  return context.userId;
};

const asRecord = (body: unknown): Record<string, unknown> =>
  typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};

const jobTitle = (jobId: string): string =>
  JOBS.find((job) => job.id === asJobId(jobId))?.title ?? 'a role';

const jobCompany = (jobId: string): string =>
  JOBS.find((job) => job.id === asJobId(jobId))?.company.name ?? 'a company';

const recordActivity = (type: Activity['type'], entityId: string, text: string): void => {
  const activity: Activity = {
    id: asActivityId(`act-${String(Date.now())}-${String(Math.floor(Math.random() * 1000))}`),
    at: nowIso(),
    type,
    entityId,
    text,
    meta: {},
  };
  mockDb.mutate((draft) => {
    draft.activity[activity.id] = activity;
  });
};

const listApplications = (context: HandlerContext): readonly Application[] => {
  const userId = requireUserId(context);
  const term = context.query.string('q', '').trim().toLowerCase();
  const statuses = context.query.list('statuses');
  const sort = context.query.string('sort', 'recent');

  let rows = Object.values(mockDb.state.applications).filter(
    (application) => application.userId === userId,
  );

  if (statuses.length > 0) {
    rows = rows.filter((application) => statuses.includes(application.status));
  }

  if (term !== '') {
    rows = rows.filter(
      (application) =>
        jobTitle(application.jobId).toLowerCase().includes(term) ||
        jobCompany(application.jobId).toLowerCase().includes(term),
    );
  }

  rows.sort((left, right) => {
    switch (sort) {
      case 'oldest':
        return new Date(left.savedAt).getTime() - new Date(right.savedAt).getTime();
      case 'company':
        return jobCompany(left.jobId).localeCompare(jobCompany(right.jobId));
      case 'status':
        return left.status.localeCompare(right.status);
      default:
        return new Date(right.lastUpdatedAt).getTime() - new Date(left.lastUpdatedAt).getTime();
    }
  });

  return rows;
};

const createApplication = (context: HandlerContext): Application => {
  const userId = requireUserId(context);
  const body = asRecord(context.body);
  const jobId = typeof body['jobId'] === 'string' ? body['jobId'] : '';
  const status: ApplicationStatus = body['status'] === 'applied' ? 'applied' : 'saved';

  if (jobId === '') {
    throw new ApiError('VALIDATION_FAILED', 'jobId is required', 422, { jobId: 'REQUIRED' });
  }

  const existing = Object.values(mockDb.state.applications).find(
    (application) => application.userId === userId && application.jobId === asJobId(jobId),
  );

  // Saving an already-saved job then applying to it must promote the existing
  // record rather than create a duplicate.
  if (existing !== undefined) {
    if (existing.status === status) return existing;
    return transition(existing, status);
  }

  const now = nowIso();
  const application: Application = {
    id: asApplicationId(`app-${String(Date.now())}`),
    userId: asUserId(userId),
    jobId: asJobId(jobId),
    status,
    savedAt: now,
    appliedAt: status === 'applied' ? now : null,
    lastUpdatedAt: now,
    notes: [],
    timeline: [{ id: `ev-${String(Date.now())}`, at: now, from: null, to: status }],
    nextStep: null,
  };

  mockDb.mutate((draft) => {
    draft.applications[application.id] = application;
  });

  recordActivity(
    status === 'applied' ? 'applied' : 'jobSaved',
    application.id,
    status === 'applied'
      ? `Applied to ${jobTitle(jobId)} at ${jobCompany(jobId)}`
      : `Saved ${jobTitle(jobId)} at ${jobCompany(jobId)}`,
  );

  return application;
};

const transition = (application: Application, to: ApplicationStatus): Application => {
  const now = nowIso();
  const updated: Application = {
    ...application,
    status: to,
    appliedAt: application.appliedAt ?? (to === 'applied' ? now : null),
    lastUpdatedAt: now,
    timeline: [
      ...application.timeline,
      { id: `ev-${String(Date.now())}`, at: now, from: application.status, to },
    ],
  };

  mockDb.mutate((draft) => {
    draft.applications[updated.id] = updated;
  });

  recordActivity(
    to === 'applied' ? 'applied' : 'statusChanged',
    updated.id,
    `Moved ${jobCompany(updated.jobId)} application to ${to}`,
  );

  return updated;
};

const updateApplication = (context: HandlerContext): Application => {
  requireUserId(context);
  const id = context.params['applicationId'] ?? '';
  const application = mockDb.state.applications[id];

  if (application === undefined) {
    throw new ApiError('NOT_FOUND', `No application with id ${id}`, 404);
  }

  const body = asRecord(context.body);
  const status = body['status'];

  if (typeof status !== 'string') {
    throw new ApiError('VALIDATION_FAILED', 'status is required', 422, { status: 'REQUIRED' });
  }

  return transition(application, status as ApplicationStatus);
};

const deleteApplication = (context: HandlerContext): { ok: true } => {
  requireUserId(context);
  const id = context.params['applicationId'] ?? '';

  if (mockDb.state.applications[id] === undefined) {
    throw new ApiError('NOT_FOUND', `No application with id ${id}`, 404);
  }

  mockDb.mutate((draft) => {
    delete draft.applications[id];
  });

  return { ok: true };
};

const addNote = (context: HandlerContext): Application => {
  requireUserId(context);
  const id = context.params['applicationId'] ?? '';
  const application = mockDb.state.applications[id];

  if (application === undefined) {
    throw new ApiError('NOT_FOUND', `No application with id ${id}`, 404);
  }

  const bodyText = asRecord(context.body)['body'];
  if (typeof bodyText !== 'string' || bodyText.trim() === '') {
    throw new ApiError('VALIDATION_FAILED', 'Note cannot be empty', 422, { body: 'REQUIRED' });
  }

  const now = nowIso();
  const updated: Application = {
    ...application,
    lastUpdatedAt: now,
    notes: [...application.notes, { id: `note-${String(Date.now())}`, at: now, body: bodyText }],
  };

  mockDb.mutate((draft) => {
    draft.applications[updated.id] = updated;
  });

  return updated;
};

export const applicationRoutes: readonly MockRoute[] = [
  { method: 'GET', pattern: '/applications', latency: 'normal', auth: true, handler: listApplications },
  { method: 'POST', pattern: '/applications', latency: 'fast', auth: true, handler: createApplication },
  {
    method: 'PATCH',
    pattern: '/applications/:applicationId',
    latency: 'fast',
    auth: true,
    handler: updateApplication,
  },
  {
    method: 'DELETE',
    pattern: '/applications/:applicationId',
    latency: 'fast',
    auth: true,
    handler: deleteApplication,
  },
  {
    method: 'POST',
    pattern: '/applications/:applicationId/notes',
    latency: 'fast',
    auth: true,
    handler: addNote,
  },
];
