import { FinishReason, GoogleGenAI } from '@google/genai';

import { env } from '../config/env.js';
import {
  assertValidCvAnalysis,
  conversionInstructions,
  exampleSource,
  GeminiCvError,
  schemaSource,
} from './cvAnalysisContract.js';
import type { CvAnalysis } from './cvAnalysisContract.js';
import { EXTRACTION_GUIDANCE } from './extractionGuidance.js';

/**
 * Turns the plain text of a CV into a contract-shaped analysis document.
 *
 * The one job here is the conversion. Reading the file, deciding what to do
 * with the result, and scoring it against a job all belong elsewhere — this
 * module takes text and returns a document that has already been proven to
 * match backend/contracts/cv-analysis.schema.json, or throws saying why.
 *
 * Not wired into the upload flow. It is called by runCvExtraction.ts only.
 */

/*
 * Repeated from checkGemini.ts rather than shared, to leave that working script
 * untouched. Worth collapsing into one constant when Gemini reaches a request
 * path; until then the duplication is two lines and visible.
 */
const MODEL = 'gemini-3.6-flash';

export interface CvExtractionResult {
  readonly analysis: CvAnalysis;
  readonly model: string;
  /** Characters of CV text sent. Useful for spotting a truncated extraction. */
  readonly inputCharacters: number;
}

/** What the model is asked. Both halves are asserted on by the tests. */
export interface ModelRequest {
  readonly systemInstruction: string;
  readonly prompt: string;
}

/** The only parts of a model reply this module reads. */
export interface ModelReply {
  readonly text: string | undefined;
  readonly finishReason: FinishReason | undefined;
}

/**
 * The single call this module makes to a model.
 *
 * Named as a type so the tests can supply their own and exercise every failure
 * branch — truncation, malformed JSON, a schema violation — without a network
 * call, and without the flakiness a live-model assertion would carry.
 */
export type GenerateJson = (request: ModelRequest) => Promise<ModelReply>;

/*
 * The schema and the example go in the prompt rather than in Gemini's
 * responseSchema field. The contract declares personalInformation and other as
 * dynamic objects with additionalProperties: true, which the structured-output
 * schema dialect cannot express — constraining the call that way would force
 * those two sections to a fixed set of keys and quietly break the contract.
 *
 * So the model is asked for JSON, and Ajv is what actually enforces the shape.
 */
const buildPrompt = (cvText: string): string =>
  [
    '# Target JSON Schema',
    'Your output must validate against this schema exactly:',
    schemaSource,
    '',
    '# Example output',
    'This is a correctly shaped document produced from a different CV. Follow its',
    'structure and conventions, never its content:',
    exampleSource,
    '',
    '# CV to convert',
    'Convert the CV below, in full. Every section of it is evidence, not just the',
    'sections that look like skill lists. Return only the JSON document.',
    '---',
    cvText,
  ].join('\n');

/*
 * The contract's own rules come first and the pipeline's reading guidance
 * second, so that on any point where both speak the contract is what the model
 * has read most recently as authoritative, and the guidance reads as a
 * refinement of it rather than a competing instruction.
 */
const buildSystemInstruction = (): string =>
  [conversionInstructions, '', EXTRACTION_GUIDANCE].join('\n');

const callGemini: GenerateJson = async ({ systemInstruction, prompt }) => {
  /*
   * Read through the validated configuration rather than process.env, so this
   * module cannot disagree with the server about what is configured. The key is
   * optional in the schema because nothing on a request path uses Gemini yet,
   * which makes the absent case this module's to reject — before any network
   * call, and with a message that says what to do.
   */
  const apiKey = env().GEMINI_API_KEY;

  if (apiKey === undefined || apiKey.trim() === '') {
    throw new GeminiCvError(
      'GEMINI_NOT_CONFIGURED',
      'GEMINI_API_KEY is missing or empty. Set it in backend/.env before running an extraction.',
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction,
      // Asks the API itself for JSON, so the reply arrives without the ```json
      // fences a model otherwise adds and a parser would choke on.
      responseMimeType: 'application/json',
      // Extraction, not writing. The same CV should give the same document.
      temperature: 0,
    },
  });

  return { text: response.text, finishReason: response.candidates?.[0]?.finishReason };
};

export const extractCvAnalysis = async (
  cvText: string,
  generate: GenerateJson = callGemini,
): Promise<CvExtractionResult> => {
  // An empty CV is rejected here rather than sent, because the model would
  // answer a blank prompt with a plausible empty document and that failure is
  // far harder to recognise than this one.
  if (cvText.trim() === '') {
    throw new GeminiCvError('CV_TEXT_EMPTY', 'No CV text was supplied, so there is nothing to convert.');
  }

  const { text, finishReason } = await generate({
    systemInstruction: buildSystemInstruction(),
    // Sent whole and unedited. Trimming the CV to the parts that look like
    // skills is exactly what stops the model seeing a summary line or a bullet
    // that proves a skill, so the full text goes even when it is long.
    prompt: buildPrompt(cvText),
  });

  if (text === undefined || text.trim() === '') {
    /*
     * Distinguished from a plain empty answer: hitting the output limit is a
     * long-CV problem with a different fix, and reporting both as "no response"
     * would send the reader looking at the wrong thing.
     */
    if (finishReason === FinishReason.MAX_TOKENS) {
      throw new GeminiCvError(
        'GEMINI_RESPONSE_TRUNCATED',
        `Gemini hit its output limit before finishing the document (model ${MODEL}).`,
      );
    }

    throw new GeminiCvError(
      'GEMINI_EMPTY_RESPONSE',
      `Gemini returned no text for model ${MODEL}${
        finishReason === undefined ? '' : ` (finishReason: ${finishReason})`
      }.`,
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    /*
     * The reply is kept out of the message. It can run to tens of kilobytes and
     * carries the candidate's own details, so the length and the parser's
     * complaint are what get reported.
     */
    throw new GeminiCvError(
      'GEMINI_INVALID_JSON',
      `Gemini did not return valid JSON (${String(text.length)} characters received).`,
      [error instanceof Error ? error.message : String(error)],
    );
  }

  // Throws GEMINI_SCHEMA_VIOLATION listing every problem. Nothing is repaired.
  const analysis = assertValidCvAnalysis(parsed);

  return { analysis, model: MODEL, inputCharacters: cvText.length };
};
