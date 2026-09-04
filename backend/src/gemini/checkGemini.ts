import { GoogleGenAI } from '@google/genai';

import { env } from '../config/env.js';

/**
 * Smallest possible proof that the backend can reach Gemini.
 *
 * It exists to answer one question — does the configured credential produce a
 * real response — and nothing else. It is not wired into the server, does not
 * touch the database, and knows nothing about CVs.
 *
 * Run it with:
 *   npm run gemini:check
 */

/*
 * The examples in the installed 2.21.0 typings still name gemini-2.0-flash,
 * which the API now rejects as retired — it answered a request for it with a
 * 404 naming this model as the replacement. Bundled typings lag the service, so
 * this value comes from the live API rather than from the SDK's docblocks.
 */
const MODEL = 'gemini-3.6-flash';

const PROMPT = 'Return only the word OK';

const run = async (): Promise<void> => {
  /*
   * Read through the validated configuration rather than process.env, so this
   * script cannot disagree with the server about what is configured.
   *
   * The key is optional in the schema because the server does not use Gemini
   * yet, which makes the absent case this script's own to reject — and it does
   * so before any network call, with a message that says what to do.
   */
  const apiKey = env().GEMINI_API_KEY;

  if (apiKey === undefined || apiKey.trim() === '') {
    throw new Error(
      'GEMINI_API_KEY is missing or empty. Set it in backend/.env before running this check.',
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: PROMPT,
  });

  // `text` is `string | undefined`: a response carrying only non-text parts, or
  // one stopped by a safety filter, has no text to read. Treated as a failure
  // rather than printed as "undefined".
  const text = response.text;

  if (text === undefined || text.trim() === '') {
    throw new Error(`Gemini returned no text for model ${MODEL}.`);
  }

  // The model's answer only. Never the key, and never the whole response
  // object, which carries request metadata.
  console.log(text.trim());
};

run().catch((error: unknown) => {
  console.error(
    'Gemini check failed:',
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
