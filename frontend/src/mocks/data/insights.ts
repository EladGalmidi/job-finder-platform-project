import { daysAgo, hoursAgo } from '@/lib/dates';
import { asActivityId, asAlertId } from '@/types';
import type { Activity, Alert } from '@/types';

export const ALERTS: readonly Alert[] = [
  {
    id: asAlertId('alert-1'),
    type: 'newMatch',
    severity: 'success',
    title: '3 new matches this week',
    body: 'Three listings scored above 80% against your CV, including a senior frontend role at Verdant AI.',
    createdAt: hoursAgo(5),
    isRead: false,
    isDismissed: false,
    actionRoute: '/jobs?tab=matched',
  },
  {
    id: asAlertId('alert-2'),
    type: 'cvTip',
    severity: 'warning',
    title: 'Your CV is missing measurable outcomes',
    body: 'Six bullets describe responsibilities without results. This is the single largest drag on your score.',
    createdAt: hoursAgo(20),
    isRead: false,
    isDismissed: false,
    actionRoute: '/cv',
  },
  {
    id: asAlertId('alert-3'),
    type: 'market',
    severity: 'info',
    title: 'Next.js demand up 14% this quarter',
    body: 'It now appears in about half of the senior frontend listings you match against.',
    createdAt: daysAgo(2),
    isRead: true,
    isDismissed: false,
    actionRoute: '/market',
  },
  {
    id: asAlertId('alert-4'),
    type: 'deadline',
    severity: 'danger',
    title: 'Interview follow-up overdue',
    body: 'You marked a follow-up for the PulseMetric interview three days ago and it is still open.',
    createdAt: daysAgo(3),
    isRead: false,
    isDismissed: false,
    actionRoute: '/applications',
  },
] as const;

export const ACTIVITY: readonly Activity[] = [
  {
    id: asActivityId('act-1'),
    at: hoursAgo(4),
    type: 'jobSaved',
    entityId: 'job-008',
    text: 'Saved Senior Frontend Engineer at Verdant AI',
    meta: { jobId: 'job-008' },
  },
  {
    id: asActivityId('act-2'),
    at: hoursAgo(26),
    type: 'statusChanged',
    entityId: 'app-2',
    text: 'Moved PulseMetric application to Interview',
    meta: { from: 'applied', to: 'interview' },
  },
  {
    id: asActivityId('act-3'),
    at: daysAgo(2),
    type: 'applied',
    entityId: 'app-3',
    text: 'Applied to Platform Engineer at KernelWorks',
    meta: { jobId: 'job-004' },
  },
  {
    id: asActivityId('act-4'),
    at: daysAgo(6),
    type: 'cvAnalyzed',
    entityId: 'cv-demo',
    text: 'CV analysed — score 74',
    meta: { score: 74 },
  },
  {
    id: asActivityId('act-5'),
    at: daysAgo(30),
    type: 'preferencesUpdated',
    entityId: 'user-demo',
    text: 'Updated job preferences',
    meta: {},
  },
] as const;
