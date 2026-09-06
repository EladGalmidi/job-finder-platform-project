import type { CvAnalysis } from '../gemini/cvAnalysisContract.js';

/**
 * The boundary between this system and the service that scores a CV.
 *
 * That service does not exist yet — a colleague is building it. This interface
 * is the shape of the hole it will fill, written now so the rest of the backend
 * can be finished against it. When the real API arrives, a second implementer
 * of this interface replaces the mock and nothing above this line changes.
 *
 * Deliberately narrow. Scoring, insights, job matching and recommendations all
 * belong on the far side of this boundary; this system's only jobs are handing
 * over a validated document and reading back what came out.
 */

/** What the scoring service says about a CV. */
export interface ScoreResult {
  readonly cvId: string;
  readonly score: number;
}

export interface SubmitCvAnalysis {
  readonly cvId: string;
  readonly userId: string;
  /** A document that has already passed schema validation. */
  readonly analysis: CvAnalysis;
}

export interface ScoringService {
  /**
   * Hands a validated CV document to the scoring service and returns its score.
   *
   * Callers must only reach this with a document that passed validation — the
   * service is entitled to assume the contract holds.
   */
  submit(input: SubmitCvAnalysis): Promise<ScoreResult>;

  /** The score already held for a CV, or null if it has not been scored. */
  scoreFor(cvId: string): Promise<ScoreResult | null>;
}
