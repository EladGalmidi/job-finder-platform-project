import { ApiError } from '@/types';
import type { Activity, Alert, DashboardMetrics, MarketRoleSnapshot, RoleKey } from '@/types';

import { JOBS } from '../data/jobs';
import { MARKET_SNAPSHOTS } from '../data/market';
import { mockDb } from '../db/mockDb';
import { computeMatch } from '../matching';
import type { HandlerContext, MockRoute } from '../transport/router';

const requireUserId = (context: HandlerContext): string => {
  if (context.userId === null) {
    throw new ApiError('UNAUTHORIZED', 'Not signed in', 401);
  }
  return context.userId;
};

const listAlerts = (context: HandlerContext): readonly Alert[] => {
  const userId = requireUserId(context);
  return Object.values(mockDb.state.alerts)
    .filter((alert) => alert.userId === userId && !alert.isDismissed)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
};

const updateAlert = (context: HandlerContext): Alert => {
  const userId = requireUserId(context);
  const id = context.params['alertId'] ?? '';
  const alert = mockDb.state.alerts[id];

  // Someone else's alert is indistinguishable from one that does not exist —
  // a 403 here would confirm the id is real.
  if (alert?.userId !== userId) {
    throw new ApiError('NOT_FOUND', `No alert with id ${id}`, 404);
  }

  const body = typeof context.body === 'object' && context.body !== null ? context.body : {};
  const patch = body as { isRead?: unknown; isDismissed?: unknown };

  const updated: Alert = {
    ...alert,
    isRead: typeof patch.isRead === 'boolean' ? patch.isRead : alert.isRead,
    isDismissed: typeof patch.isDismissed === 'boolean' ? patch.isDismissed : alert.isDismissed,
  };

  mockDb.mutate((draft) => {
    draft.alerts[updated.id] = updated;
  });

  return updated;
};

const listActivity = (context: HandlerContext): readonly Activity[] => {
  const userId = requireUserId(context);
  const limit = context.query.number('limit') ?? 10;

  return Object.values(mockDb.state.activity)
    .filter((entry) => entry.userId === userId)
    .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime())
    .slice(0, limit);
};

const marketSnapshot = (context: HandlerContext): MarketRoleSnapshot => {
  const roleKey = (context.params['roleKey'] ?? '') as RoleKey;
  const snapshot = MARKET_SNAPSHOTS[roleKey];

  if (snapshot === undefined) {
    throw new ApiError('NOT_FOUND', `No market data for role ${roleKey}`, 404);
  }

  return snapshot;
};

const dashboardMetrics = (context: HandlerContext): DashboardMetrics => {
  const userId = requireUserId(context);
  const user = mockDb.state.users[userId];

  const analysis =
    user?.activeCvId == null ? undefined : mockDb.state.analysesByCvId[user.activeCvId];

  const skills = analysis?.detectedSkills ?? [];
  const preferences = user?.preferences ?? null;

  const matches = JOBS.map((job) => computeMatch({ job, userSkills: skills, preferences }));
  const matched = matches.filter((match) => match.score >= 55);

  const applications = Object.values(mockDb.state.applications).filter(
    (application) => application.userId === userId,
  );

  // Profile completion is derived rather than stored, so it cannot drift out of
  // sync with the fields it summarises.
  const completionParts = [
    user?.preferences != null,
    user?.activeCvId != null,
    analysis !== undefined,
    user?.headline != null,
  ];
  const completed = completionParts.filter(Boolean).length;

  // Distinct skills the matching roles ask for and the CV does not show.
  const owned = new Set(skills.map((skill) => skill.skillId));
  const missingSkillIds = new Set(
    matched.flatMap((match) =>
      match.missingSkills.filter((skill) => !owned.has(skill.skillId)).map((s) => s.skillId),
    ),
  );

  return {
    matchedJobsCount: matched.length,
    applicationsSent: applications.filter((application) => application.status !== 'saved').length,
    missingSkillsCount: missingSkillIds.size,
    newMatchesThisWeek: matched.filter((match) => {
      const job = JOBS.find((entry) => entry.id === match.jobId);
      if (job === undefined) return false;
      return Date.now() - new Date(job.postedAt).getTime() < 7 * 24 * 60 * 60 * 1000;
    }).length,
    activeApplications: applications.filter((application) =>
      ['applied', 'interview', 'offer'].includes(application.status),
    ).length,
    interviewsScheduled: applications.filter((application) => application.status === 'interview')
      .length,
    cvScore: analysis?.score ?? null,
    profileCompletionPercent: Math.round((completed / completionParts.length) * 100),
  };
};

export const insightRoutes: readonly MockRoute[] = [
  { method: 'GET', pattern: '/alerts', latency: 'fast', auth: true, handler: listAlerts },
  { method: 'PATCH', pattern: '/alerts/:alertId', latency: 'fast', auth: true, handler: updateAlert },
  { method: 'GET', pattern: '/activity', latency: 'fast', auth: true, handler: listActivity },
  {
    method: 'GET',
    pattern: '/market/roles/:roleKey',
    latency: 'normal',
    handler: marketSnapshot,
  },
  {
    method: 'GET',
    pattern: '/dashboard/metrics',
    latency: 'normal',
    auth: true,
    handler: dashboardMetrics,
  },
];
