import type { AnalysisJobId, CvId, ISODateTime, Seniority, SkillId, UserId } from './common';
import type { SkillLevel } from './job';
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

/**
 * A CV reduced to machine-readable form, for handing to another system.
 *
 * Deliberately an envelope rather than a parsed record. `content.text` is the
 * document as extracted and is the ground truth; `parsed` is this system's
 * reading of it, which a consumer is free to distrust and re-derive. Keeping
 * both means a parsing mistake here never becomes an unrecoverable one
 * downstream, and `extraction` says how much of the file was actually read.
 *
 * Nothing is inferred that cannot be evidenced from the text. Employers, job
 * titles and dates are absent because this system does not parse them, and an
 * empty field is more useful to a consumer than a guessed one.
 */
export interface CvDocument {
  /** Bumped whenever the shape changes, so consumers can branch on it. */
  schemaVersion: '1.0';
  generatedAt: ISODateTime;

  source: {
    cvId: CvId;
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    uploadedAt: ISODateTime;
  };

  extraction: {
    /** How the text was obtained. */
    method: 'pdf-text-layer' | 'docx';
    pages: number | null;
    characters: number;
  };

  content: {
    /** The document text, as extracted. Ground truth for any re-parse. */
    text: string;
  };

  parsed: {
    skills: {
      id: SkillId;
      name: string;
      /** Inferred from how often the skill is mentioned, nothing more. */
      level: SkillLevel | null;
    }[];
    experienceYears: number | null;
    seniorityEstimate: Seniority | null;
    keywordsFound: string[];
  };
}

/**
 * What `GET /cv/:cvId/score` returns.
 *
 * An object, never a bare number, and read only through `score`. The scoring
 * service behind this endpoint is still a stand-in; the real one is expected to
 * answer at the same path with more fields alongside — a timestamp, a level, a
 * breakdown of its own. Callers that take the value from `score` keep working
 * when that happens, so nothing here should assume these are the only keys.
 */
export interface CvScore {
  score: number;
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
