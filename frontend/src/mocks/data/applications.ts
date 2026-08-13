import { daysAgo, hoursAgo, daysFromNow } from '@/lib/dates';
import { asApplicationId, asJobId, asUserId } from '@/types';
import type { Application } from '@/types';

const USER = asUserId('user-demo');

export const APPLICATIONS: readonly Application[] = [
  {
    id: asApplicationId('app-1'),
    userId: USER,
    jobId: asJobId('job-008'),
    status: 'saved',
    savedAt: hoursAgo(4),
    appliedAt: null,
    lastUpdatedAt: hoursAgo(4),
    notes: [],
    timeline: [{ id: 'ev-1', at: hoursAgo(4), from: null, to: 'saved' }],
    nextStep: null,
  },
  {
    id: asApplicationId('app-2'),
    userId: USER,
    jobId: asJobId('job-003'),
    status: 'interview',
    savedAt: daysAgo(12),
    appliedAt: daysAgo(10),
    lastUpdatedAt: hoursAgo(26),
    notes: [
      {
        id: 'note-1',
        at: daysAgo(9),
        body: 'Recruiter screen went well. They care most about rendering performance on large tables.',
      },
      {
        id: 'note-2',
        at: hoursAgo(26),
        body: 'Technical round scheduled. Prepare the virtualised-table example.',
      },
    ],
    timeline: [
      { id: 'ev-2', at: daysAgo(12), from: null, to: 'saved' },
      { id: 'ev-3', at: daysAgo(10), from: 'saved', to: 'applied' },
      {
        id: 'ev-4',
        at: hoursAgo(26),
        from: 'applied',
        to: 'interview',
        note: 'Technical round scheduled',
      },
    ],
    nextStep: { label: 'Technical interview', dueAt: daysFromNow(2) },
  },
  {
    id: asApplicationId('app-3'),
    userId: USER,
    jobId: asJobId('job-004'),
    status: 'applied',
    savedAt: daysAgo(3),
    appliedAt: daysAgo(2),
    lastUpdatedAt: daysAgo(2),
    notes: [
      { id: 'note-3', at: daysAgo(2), body: 'Applied through the company site rather than LinkedIn.' },
    ],
    timeline: [
      { id: 'ev-5', at: daysAgo(3), from: null, to: 'saved' },
      { id: 'ev-6', at: daysAgo(2), from: 'saved', to: 'applied' },
    ],
    nextStep: { label: 'Follow up if no reply', dueAt: daysFromNow(5) },
  },
  {
    id: asApplicationId('app-4'),
    userId: USER,
    jobId: asJobId('job-002'),
    status: 'rejected',
    savedAt: daysAgo(28),
    appliedAt: daysAgo(26),
    lastUpdatedAt: daysAgo(18),
    notes: [{ id: 'note-4', at: daysAgo(18), body: 'Rejected at CV stage — they wanted production Go.' }],
    timeline: [
      { id: 'ev-7', at: daysAgo(28), from: null, to: 'saved' },
      { id: 'ev-8', at: daysAgo(26), from: 'saved', to: 'applied' },
      { id: 'ev-9', at: daysAgo(18), from: 'applied', to: 'rejected', note: 'No Go experience' },
    ],
    nextStep: null,
  },
  {
    id: asApplicationId('app-5'),
    userId: USER,
    jobId: asJobId('job-006'),
    status: 'offer',
    savedAt: daysAgo(40),
    appliedAt: daysAgo(38),
    lastUpdatedAt: daysAgo(5),
    notes: [{ id: 'note-5', at: daysAgo(5), body: 'Offer received. Negotiating the equity component.' }],
    timeline: [
      { id: 'ev-10', at: daysAgo(40), from: null, to: 'saved' },
      { id: 'ev-11', at: daysAgo(38), from: 'saved', to: 'applied' },
      { id: 'ev-12', at: daysAgo(22), from: 'applied', to: 'interview' },
      { id: 'ev-13', at: daysAgo(5), from: 'interview', to: 'offer' },
    ],
    nextStep: { label: 'Respond to offer', dueAt: daysFromNow(4) },
  },
] as const;
