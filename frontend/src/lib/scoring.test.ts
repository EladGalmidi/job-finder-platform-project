import { describe, expect, it } from 'vitest';

import { MATCH_THRESHOLDS, clampScore, scoreBand } from './scoring';

describe('scoreBand', () => {
  it('treats the documented thresholds as inclusive lower bounds', () => {
    expect(scoreBand(MATCH_THRESHOLDS.high)).toBe('high');
    expect(scoreBand(MATCH_THRESHOLDS.high - 1)).toBe('medium');
    expect(scoreBand(MATCH_THRESHOLDS.medium)).toBe('medium');
    expect(scoreBand(MATCH_THRESHOLDS.medium - 1)).toBe('low');
  });

  it('matches the product spec at the boundaries', () => {
    expect(scoreBand(100)).toBe('high');
    expect(scoreBand(80)).toBe('high');
    expect(scoreBand(79)).toBe('medium');
    expect(scoreBand(55)).toBe('medium');
    expect(scoreBand(54)).toBe('low');
    expect(scoreBand(0)).toBe('low');
  });
});

describe('clampScore', () => {
  it('constrains and rounds to 0-100', () => {
    expect(clampScore(-12)).toBe(0);
    expect(clampScore(142)).toBe(100);
    expect(clampScore(73.6)).toBe(74);
  });
});
