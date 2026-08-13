import type { ApplicationId, ISODateTime, JobId, UserId } from './common';
import type { Job } from './job';

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

/**
 * What `GET /applications` returns per row.
 *
 * The job travels with the application so the list does not issue one request
 * per row just to render a title and a company name.
 */
export interface ApplicationListItem {
  application: Application;
  job: Job;
}

export type ApplicationSort = 'recent' | 'oldest' | 'company' | 'status';

export interface ApplicationQuery {
  q: string;
  statuses: ApplicationStatus[];
  sort: ApplicationSort;
}
