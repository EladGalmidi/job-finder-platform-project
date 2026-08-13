import type { MatchBand } from '@/types';

/**
 * Single source of truth for match bands.
 *
 * Product spec: >=80 green, 55-79 orange, <55 red. Nothing else in the codebase
 * may inline these numbers — the band drives colour, icon and label together so
 * the score is never communicated by colour alone.
 */
export const MATCH_THRESHOLDS = {
  high: 80,
  medium: 55,
} as const;

export const scoreBand = (score: number): MatchBand => {
  if (score >= MATCH_THRESHOLDS.high) return 'high';
  if (score >= MATCH_THRESHOLDS.medium) return 'medium';
  return 'low';
};

export const clampScore = (score: number): number => Math.max(0, Math.min(100, Math.round(score)));

/** CV score sections use the same banding so the visual language stays consistent. */
export const scoreBandCssVar = (band: MatchBand): string =>
  ({
    high: 'var(--color-success)',
    medium: 'var(--color-warning)',
    low: 'var(--color-danger)',
  })[band];
