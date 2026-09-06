import { eq } from 'drizzle-orm';

import { database } from '../db/client.js';
import { mockScoringResults, mockScoringSubmissions } from '../db/schema.js';
import type { ScoreResult, ScoringService, SubmitCvAnalysis } from './scoringService.js';

/**
 * A stand-in for the scoring service, so the end to end path can be finished
 * and tested before that service exists.
 *
 * It is a mock in one respect only: the number it returns is fixed. Everything
 * around that number is real — the document is stored, the ordering is
 * enforced, the score is read back over the same interface the real client will
 * implement. That is what makes this worth having rather than returning 88 from
 * the route and calling it done.
 *
 * Replacing it is a one-line change at the bottom of this file plus a new
 * implementation of ScoringService that speaks HTTP. Nothing that calls it
 * needs to know which one it got.
 */

/**
 * The score every submission receives.
 *
 * A test value with no meaning. It is deliberately not derived from the CV: no
 * scoring happens on this side of the boundary, and a number that looked
 * calculated would invite someone to trust it.
 */
export const MOCK_SCORE = 88;

export const mockScoringService: ScoringService = {
  async submit({ cvId, userId, analysis }: SubmitCvAnalysis): Promise<ScoreResult> {
    const { db } = database();

    /*
     * Two writes, in this order, because a score must never exist for a
     * document that was not stored. The foreign key on mock_scoring_results
     * makes that a database guarantee: if this insert fails, the one below
     * cannot succeed.
     *
     * Upserts rather than inserts so re-analysing a CV replaces its submission
     * instead of failing on the primary key.
     */
    await db
      .insert(mockScoringSubmissions)
      .values({ cvId, userId, document: analysis })
      .onConflictDoUpdate({
        target: mockScoringSubmissions.cvId,
        set: { document: analysis, submittedAt: new Date() },
      });

    await db
      .insert(mockScoringResults)
      .values({ cvId, userId, score: MOCK_SCORE })
      .onConflictDoUpdate({
        target: mockScoringResults.cvId,
        set: { score: MOCK_SCORE, scoredAt: new Date() },
      });

    return { cvId, score: MOCK_SCORE };
  },

  async scoreFor(cvId: string): Promise<ScoreResult | null> {
    const rows = await database()
      .db.select({ cvId: mockScoringResults.cvId, score: mockScoringResults.score })
      .from(mockScoringResults)
      .where(eq(mockScoringResults.cvId, cvId))
      .limit(1);

    return rows[0] ?? null;
  },
};

/*
 * The single place the implementation is chosen. Pointing this at an HTTP
 * client is the whole of the switch to the real service.
 */
export const scoringService: ScoringService = mockScoringService;
