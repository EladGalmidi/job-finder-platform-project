import type { ApplicationId, ISODateTime, JobId, UserId } from './common';

/**
 * "Saved" is an application in its first status rather than a separate concept.
 * This keeps one source of truth for a job's state and gives the timeline a
 * natural starting point.
 */
export type ApplicationStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected';

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'saved',
  'applied',
  'interview',
  'offer',
  'rejected',
];

export interface ApplicationNote {
  id: string;
  at: ISODateTime;
  body: string;
}

export interface ApplicationEvent {
  id: string;
  at: ISODateTime;
  from: ApplicationStatus | null;
  to: ApplicationStatus;
  note?: string;
}

export interface ApplicationNextStep {
  label: string;
  dueAt: ISODateTime;
}

export interface Application {
  id: ApplicationId;
  userId: UserId;
  jobId: JobId;
  status: ApplicationStatus;
  savedAt: ISODateTime;
  appliedAt: ISODateTime | null;
  lastUpdatedAt: ISODateTime;
  notes: ApplicationNote[];
  timeline: ApplicationEvent[];
  nextStep: ApplicationNextStep | null;
}

export type ApplicationSort = 'recent' | 'oldest' | 'company' | 'status';

export interface ApplicationQuery {
  q: string;
  statuses: ApplicationStatus[];
  sort: ApplicationSort;
}
