import { describe, expect, it } from 'vitest';

import { en } from './en';
import { he } from './he';
import { translate, translatePlural } from './t';

describe('catalogues', () => {
  it('define exactly the same keys', () => {
    // The type system already enforces this; the test catches a widened type.
    expect(Object.keys(he).sort()).toEqual(Object.keys(en).sort());
  });

  it('has no empty strings', () => {
    for (const [key, value] of Object.entries(he)) {
      expect(value.trim(), `he.${key} is empty`).not.toBe('');
    }
  });
});

describe('translate', () => {
  it('interpolates named placeholders', () => {
    expect(translate('en', 'match.scoreLabel', { score: 87 })).toBe('Match score 87%');
    expect(translate('he', 'match.scoreLabel', { score: 87 })).toBe('ציון התאמה 87%');
  });

  it('leaves unknown placeholders untouched rather than printing undefined', () => {
    expect(translate('en', 'match.scoreLabel')).toBe('Match score {score}%');
  });
});

describe('translatePlural', () => {
  it('uses English one/other', () => {
    expect(translatePlural('en', 'jobs.count', 1)).toBe('1 job');
    expect(translatePlural('en', 'jobs.count', 5)).toBe('5 jobs');
  });

  it('uses the Hebrew dual form, which a count===1 check would get wrong', () => {
    expect(translatePlural('he', 'jobs.count', 1)).toBe('משרה אחת');
    expect(translatePlural('he', 'jobs.count', 2)).toBe('שתי משרות');
    expect(translatePlural('he', 'jobs.count', 7)).toBe('7 משרות');
  });
});
