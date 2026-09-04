import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  assertValidCvAnalysis,
  conversionInstructions,
  exampleSource,
  GeminiCvError,
  schemaSource,
} from './cvAnalysisContract.js';

/**
 * Guards the contract itself and the gate that enforces it.
 *
 * No model is involved. These tests answer whether a document that violates the
 * agreement can reach the scoring service, which is a question about our code
 * and stays deterministic.
 */

const codeOf = (run: () => unknown): string => {
  try {
    run();
  } catch (error) {
    if (error instanceof GeminiCvError) return error.code;
    throw error;
  }

  throw new Error('Expected the document to be rejected, but it was accepted.');
};

const problemsOf = (run: () => unknown): readonly string[] => {
  try {
    run();
  } catch (error) {
    if (error instanceof GeminiCvError) return error.details;
    throw error;
  }

  throw new Error('Expected the document to be rejected, but it was accepted.');
};

describe('the CV analysis contract', () => {
  it('loads all three contract files', () => {
    expect(schemaSource.length).toBeGreaterThan(0);
    expect(conversionInstructions.length).toBeGreaterThan(0);
    expect(exampleSource.length).toBeGreaterThan(0);
  });

  it('declares the schema the scoring service agreed to', () => {
    const schema: unknown = JSON.parse(schemaSource);

    // Pinned deliberately. Any change to these five sections is a change to the
    // agreement with the scoring service and must be a conscious decision, not
    // a side effect of a prompt tweak.
    expect(schema).toMatchObject({
      required: [
        'personalInformation',
        'technicalExperience',
        'nonTechnicalExperience',
        'achievements',
        'other',
      ],
    });
  });

  it('accepts the example the contract ships with', () => {
    // If this fails the two contract files have drifted apart, and the example
    // we send the model as a template no longer matches what we validate.
    const example: unknown = JSON.parse(exampleSource);

    expect(() => assertValidCvAnalysis(example)).not.toThrow();
  });
});

describe('schema validation', () => {
  const valid: unknown = JSON.parse(exampleSource);

  const withTechnical = (skill: unknown): unknown => ({
    personalInformation: {},
    technicalExperience: [skill],
    nonTechnicalExperience: [],
    achievements: [],
    other: {},
  });

  const baseSkill = {
    skill: 'Terraform',
    period: { startDate: '2021', endDate: null, isCurrent: true },
    experienceDuration: { unit: 'years', value: null },
    usageDepth: { level: 'working', activities: ['maintain'] },
    evidence: [{ sourceExcerpt: 'Maintained Terraform modules.', employer: null, role: null }],
  };

  it('accepts a minimal document with every required section', () => {
    expect(() => assertValidCvAnalysis(withTechnical(baseSkill))).not.toThrow();
  });

  it('rejects a document missing a required section', () => {
    const complete = JSON.parse(exampleSource) as Record<string, unknown>;
    const missing = Object.fromEntries(Object.entries(complete).filter(([key]) => key !== 'other'));

    expect(codeOf(() => assertValidCvAnalysis(missing))).toBe('GEMINI_SCHEMA_VIOLATION');
  });

  it('rejects an invented top-level field', () => {
    // The contract is closed at the root, so a score or a recommendation block
    // cannot be smuggled in alongside it.
    const withScore = { ...(valid as Record<string, unknown>), score: 87 };

    expect(problemsOf(() => assertValidCvAnalysis(withScore)).join(' ')).toContain('score');
  });

  it('rejects an invented field inside a skill record', () => {
    const problems = problemsOf(() =>
      assertValidCvAnalysis(withTechnical({ ...baseSkill, proficiency: 'expert' })),
    );

    expect(problems.join(' ')).toContain('proficiency');
  });

  it('rejects a usageDepth level outside the agreed four', () => {
    const problems = problemsOf(() =>
      assertValidCvAnalysis(
        withTechnical({ ...baseSkill, usageDepth: { level: 'expert', activities: [] } }),
      ),
    );

    expect(problems.join(' ')).toContain('usageDepth/level');
  });

  it('rejects a skill carrying no evidence at all', () => {
    const problems = problemsOf(() => assertValidCvAnalysis(withTechnical({ ...baseSkill, evidence: [] })));

    expect(problems.join(' ')).toContain('evidence');
  });

  it('rejects a date that invents precision the format does not allow', () => {
    const problems = problemsOf(() =>
      assertValidCvAnalysis(
        withTechnical({ ...baseSkill, period: { startDate: 'May 2021', endDate: null, isCurrent: true } }),
      ),
    );

    expect(problems.join(' ')).toContain('startDate');
  });

  it('accepts every precision the contract does allow', () => {
    for (const startDate of ['2021', '2021-05', '2021-05-20', null]) {
      expect(() =>
        assertValidCvAnalysis(
          withTechnical({ ...baseSkill, period: { startDate, endDate: null, isCurrent: true } }),
        ),
      ).not.toThrow();
    }
  });

  it('reports every problem at once rather than stopping at the first', () => {
    const problems = problemsOf(() =>
      assertValidCvAnalysis(
        withTechnical({
          ...baseSkill,
          period: { startDate: 'yesterday', endDate: null, isCurrent: true },
          experienceDuration: { unit: 'decades', value: 3 },
          usageDepth: { level: 'guru', activities: [] },
          evidence: [],
        }),
      ),
    );

    // One round trip has to surface all four, or fixing a prompt becomes a
    // sequence of single-error retries.
    expect(problems.length).toBeGreaterThanOrEqual(4);
  });

  it('repairs nothing on the way through', () => {
    const document = JSON.parse(exampleSource) as Record<string, unknown>;
    const returned = assertValidCvAnalysis(document);

    // The validator narrows a type; it does not default, coerce or drop.
    expect(returned).toBe(document);
  });

  it('keeps the contract files identical to the ones on disk', () => {
    // Cheap guard against an edit that changes what we validate without
    // changing what the scoring service was promised.
    expect(schemaSource).toBe(readFileSync('contracts/cv-analysis.schema.json', 'utf8'));
    expect(exampleSource).toBe(readFileSync('contracts/cv-example.json', 'utf8'));
    expect(conversionInstructions).toBe(
      readFileSync('contracts/cv-conversion-instructions.md', 'utf8'),
    );
  });
});
