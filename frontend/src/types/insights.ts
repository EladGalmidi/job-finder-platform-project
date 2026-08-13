import type {
  ActivityId,
  AlertId,
  ISODateTime,
  RoleKey,
  SalaryRange,
  Seniority,
  SkillId,
} from './common';

export type AlertType = 'newMatch' | 'cvTip' | 'deadline' | 'market' | 'status';

export type AlertSeverity = 'info' | 'success' | 'warning' | 'danger';

export interface Alert {
  id: AlertId;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  body: string;
  createdAt: ISODateTime;
  isRead: boolean;
  isDismissed: boolean;
  actionRoute: string | null;
}

export type ActivityType =
  | 'jobSaved'
  | 'applied'
  | 'statusChanged'
  | 'cvUploaded'
  | 'cvAnalyzed'
  | 'preferencesUpdated';

export interface Activity {
  id: ActivityId;
  at: ISODateTime;
  type: ActivityType;
  entityId: string;
  text: string;
  meta: Record<string, string | number>;
}

export type MarketTrend = 'up' | 'down' | 'stable';

export interface MarketSkill {
  skillId: SkillId;
  name: string;
  roleKey: RoleKey;
  /** Share of listings for this role that require the skill, 0..100. */
  demandPercent: number;
  trend: MarketTrend;
  trendDelta: number;
  avgSalaryImpactPercent: number;
  openPositions: number;
}

export interface MarketSource {
  name: string;
  url: string;
  sampleSize: number;
  collectedAt: ISODateTime;
}

export interface MarketSalaryBand extends SalaryRange {
  median: number;
}

export interface MarketRoleSnapshot {
  roleKey: RoleKey;
  updatedAt: ISODateTime;
  sources: MarketSource[];
  topSkills: MarketSkill[];
  salaryBySeniority: Record<Seniority, MarketSalaryBand>;
  openPositions: number;
  /** Applicants per opening; higher means a tighter market. */
  competitionIndex: number;
}

export interface DashboardMetrics {
  matchedJobsCount: number;
  newMatchesThisWeek: number;
  activeApplications: number;
  interviewsScheduled: number;
  cvScore: number | null;
  profileCompletionPercent: number;
}
