import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import addFormatsModule from 'ajv-formats';
import { Ajv2020 } from 'ajv/dist/2020.js';
import type { ErrorObject, ValidateFunction } from 'ajv';

/*
 * Both packages ship CommonJS, so under NodeNext a default import is the module
 * namespace rather than the value. Ajv publishes the class as a named export,
 * which is the direct route; ajv-formats publishes only a default, so its
 * plugin has to be taken off the namespace explicitly.
 */
const addFormats = addFormatsModule.default;

/**
 * The Skills-First CV Analysis contract, loaded from backend/contracts.
 *
 * The three files in that directory are the agreement with the scoring service
 * — they are the source of truth, not this module. Nothing here restates a
 * rule from the schema; the schema is compiled and enforced as written, so a
 * change to the contract takes effect without a code change.
 *
 * Everything is read at module load rather than per call. A missing or corrupt
 * contract file is a deployment fault, and the useful moment to fail is startup,
 * not the middle of a user's upload.
 */

/*
 * The contracts directory sits beside src, not inside it, so it is resolved
 * from this module's own location rather than from process.cwd() — which
 * changes with whatever directory the script was launched from. Two levels up
 * lands on backend/ from both src/gemini (tsx) and dist/gemini (built output).
 */
const contractsDir = join(dirname(fileURLToPath(import.meta.url)), '../../contracts');

const readContract = (fileName: string): string =>
  readFileSync(join(contractsDir, fileName), 'utf8');

/** The prose rules the model must follow. Sent as the system instruction. */
export const conversionInstructions = readContract('cv-conversion-instructions.md');

/** The schema, as text, so it can be shown to the model verbatim. */
export const schemaSource = readContract('cv-analysis.schema.json');

/** A correctly shaped document for a different CV. Used as a one-shot example. */
export const exampleSource = readContract('cv-example.json');

/*
 * Hand-written to mirror the schema. The schema stays the runtime authority —
 * these types describe what a document that already passed validation contains,
 * and exist so callers can read it without casting.
 */
export type PartialDate = string | null;

export interface Period {
  readonly startDate: PartialDate;
  readonly endDate: PartialDate;
  readonly isCurrent: boolean | null;
}

export interface ExperienceDuration {
  readonly unit: 'months' | 'years';
  readonly value: number | null;
}

export type UsageLevel = 'mentioned_only' | 'basic' | 'working' | 'deep';

export interface UsageDepth {
  readonly level: UsageLevel;
  readonly activities: readonly string[];
}

export interface Evidence {
  readonly sourceExcerpt: string;
  readonly employer: string | null;
  readonly role: string | null;
}

export interface SkillExperience {
  readonly skill: string;
  readonly period: Period;
  readonly experienceDuration: ExperienceDuration;
  readonly usageDepth: UsageDepth;
  readonly evidence: readonly Evidence[];
}

export type AchievementType =
  | 'education'
  | 'certification'
  | 'recognition'
  | 'award'
  | 'publication'
  | 'project'
  | 'other';

export interface Achievement {
  readonly type: AchievementType;
  readonly content: string;
  readonly date?: PartialDate;
  readonly startDate?: PartialDate;
  readonly endDate?: PartialDate;
  readonly institution?: string | null;
  readonly location?: string | null;
}

/**
 * A CV analysis document that has passed schema validation.
 *
 * `personalInformation` and `other` are deliberately open maps: the contract
 * declares them dynamic, so the keys a CV produces are not knowable in advance.
 */
export interface CvAnalysis {
  readonly dbId?: number | null;
  readonly timestamp?: string | null;
  readonly personalInformation: Readonly<Record<string, unknown>>;
  readonly technicalExperience: readonly SkillExperience[];
  readonly nonTechnicalExperience: readonly SkillExperience[];
  readonly achievements: readonly Achievement[];
  readonly other: Readonly<Record<string, unknown>>;
}

/** Machine-readable reasons an extraction can fail. Callers branch on these. */
export type GeminiCvErrorCode =
  | 'GEMINI_NOT_CONFIGURED'
  | 'CV_TEXT_EMPTY'
  | 'GEMINI_EMPTY_RESPONSE'
  | 'GEMINI_RESPONSE_TRUNCATED'
  | 'GEMINI_INVALID_JSON'
  | 'GEMINI_SCHEMA_VIOLATION';

/**
 * A failure with a code a caller can act on.
 *
 * Kept separate from http/errors.ts ApiError on purpose: this module is not on
 * a request path, and deciding which HTTP status each of these deserves is the
 * integration step's decision, not this one's.
 */
export class GeminiCvError extends Error {
  readonly code: GeminiCvErrorCode;
  /** Per-problem detail, such as one line per schema violation. */
  readonly details: readonly string[];

  constructor(code: GeminiCvErrorCode, message: string, details: readonly string[] = []) {
    super(message);
    this.name = 'GeminiCvError';
    this.code = code;
    this.details = details;
  }
}

/*
 * Draft 2020-12, which is what the schema declares — Ajv's default export only
 * understands draft-07 and would reject $defs handling here.
 *
 * allErrors reports every violation instead of stopping at the first, because a
 * model that got the shape wrong usually got it wrong in several places and one
 * error per round trip is a slow way to find that out.
 */
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

const validate: ValidateFunction<CvAnalysis> = ajv.compile<CvAnalysis>(
  JSON.parse(schemaSource) as object,
);

const describe = (error: ErrorObject): string => {
  const where = error.instancePath === '' ? '(root)' : error.instancePath;
  const params = Object.entries(error.params)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(', ');

  return params === ''
    ? `${where} ${error.message ?? 'is invalid'}`
    : `${where} ${error.message ?? 'is invalid'} (${params})`;
};

/**
 * Narrows an unknown value to a CvAnalysis, or throws with every violation.
 *
 * Nothing is repaired, defaulted or dropped. A document that does not conform
 * is rejected whole: silently patching a model's output would hide exactly the
 * prompt regressions this validation exists to catch.
 */
export const assertValidCvAnalysis = (value: unknown): CvAnalysis => {
  if (validate(value)) return value;

  const problems = (validate.errors ?? []).map(describe);

  throw new GeminiCvError(
    'GEMINI_SCHEMA_VIOLATION',
    `Gemini returned JSON that does not match the CV analysis contract (${String(problems.length)} problem(s))`,
    problems,
  );
};
