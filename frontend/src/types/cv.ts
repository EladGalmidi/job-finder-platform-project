import type { AnalysisJobId, CvId, ISODateTime, Seniority, SkillId, UserId } from './common';
import type { SkillRef } from './job';

export type CvSource = 'upload' | 'linkedin';

export type CvStatus = 'pending' | 'analyzing' | 'ready' | 'failed';

export interface CV {
  id: CvId;
  userId: UserId;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  source: CvSource;
  uploadedAt: ISODateTime;
  status: CvStatus;
}

export type CVScoreSectionKey =
  | 'structure'
  | 'skills'
  | 'experience'
  | 'keywords'
  | 'education'
  | 'impact';

export interface CVScoreSection {
  key: CVScoreSectionKey;
  score: number;
  /** Contribution to the overall score, 0..1. Weights sum to 1. */
  weight: number;
  summary: string;
  tips: string[];
}

export type SkillPriority = 'high' | 'medium' | 'low';

export interface MissingSkill {
  skillId: SkillId;
  name: string;
  demandPercent: number;
  appearsInJobs: number;
  priority: SkillPriority;
  learnEstimateWeeks: number;
}

export type RecommendationSeverity = 'critical' | 'important' | 'nice';

export interface Recommendation {
  id: string;
  severity: RecommendationSeverity;
  title: string;
  body: string;
  actionLabel?: string;
  actionRoute?: string;
}

export interface CVAnalysis {
  id: string;
  cvId: CvId;
  score: number;
  breakdown: CVScoreSection[];
  detectedSkills: SkillRef[];
  missingSkills: MissingSkill[];
  experienceYears: number;
  seniorityEstimate: Seniority;
  keywords: {
    found: string[];
    missing: string[];
  };
  recommendations: Recommendation[];
  matchedJobsCount: number;
  analyzedAt: ISODateTime;
}

export type AnalysisStepKey =
  | 'parsing'
  | 'extractingSkills'
  | 'scoringStructure'
  | 'comparingMarket'
  | 'matchingJobs'
  | 'buildingRecommendations';

export const ANALYSIS_STEPS: AnalysisStepKey[] = [
  'parsing',
  'extractingSkills',
  'scoringStructure',
  'comparingMarket',
  'matchingJobs',
  'buildingRecommendations',
];

export type AnalysisJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

/**
 * Progress is polled, not animated.
 *
 * `POST /cv/:id/analyze` returns a job id and the UI polls this shape. That is
 * what a real backend requires, it survives a refresh mid-analysis, and it is
 * cancellable via AbortSignal.
 */
export interface AnalysisJob {
  id: AnalysisJobId;
  cvId: CvId;
  status: AnalysisJobStatus;
  progressPercent: number;
  currentStep: AnalysisStepKey;
  completedSteps: AnalysisStepKey[];
  startedAt: ISODateTime;
  finishedAt: ISODateTime | null;
}

export interface CvUploadResult {
  cv: CV;
}
