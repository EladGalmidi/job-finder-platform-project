import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import { extractText } from '../cv/extractText.js';
import { GeminiCvError } from './cvAnalysisContract.js';
import { extractCvAnalysis } from './extractCvAnalysis.js';

/**
 * End-to-end proof of the extraction path, against a real CV file.
 *
 * file -> existing extractText -> Gemini -> JSON -> schema validation -> stdout
 *
 * It exists to show the chain works before any of it goes near a request. It
 * touches no database, no route and no user record.
 *
 * Run it with:
 *   npm run gemini:cv -- "C:\path\to\cv.pdf"
 *
 * The document goes to stdout and progress to stderr, so the JSON can be
 * redirected to a file without commentary mixed into it.
 */

const usage = 'Usage: npm run gemini:cv -- <path to .pdf, .docx or .txt>';

/*
 * PDF and DOCX go through the server's own extractText — the same two-pass
 * reader, OCR fallback included — so this script proves the real path rather
 * than a second implementation of it.
 *
 * Plain text is accepted as well, and read directly. It is the fast way to
 * iterate on the prompt: pasting a CV into a .txt file skips the seconds that
 * OCR costs, and the text is all the model ever sees either way.
 */
const readCvText = async (path: string): Promise<string> => {
  const fileName = basename(path);

  if (fileName.toLowerCase().endsWith('.txt')) {
    return readFile(path, 'utf8');
  }

  const bytes = await readFile(path);
  const extraction = await extractText(bytes, fileName);

  if (extraction.outcome !== 'ok') {
    const detail = extraction.detail === undefined ? '' : ` — ${extraction.detail}`;
    throw new Error(`Could not read text from ${fileName} (${extraction.outcome})${detail}`);
  }

  if (extraction.diagnostics !== undefined) {
    const { characters, usedOcr, pages, format } = extraction.diagnostics;
    console.error(
      `Extracted ${String(characters)} characters from ${format}` +
        `${pages > 0 ? `, ${String(pages)} page(s)` : ''}${usedOcr ? ', via OCR' : ''}.`,
    );
  }

  return extraction.text;
};

const run = async (): Promise<void> => {
  const argument = process.argv[2];

  if (argument === undefined || argument.trim() === '') {
    throw new Error(`No CV file was given.\n${usage}`);
  }

  const path = resolve(argument);
  console.error(`Reading ${path}`);

  const cvText = await readCvText(path);

  console.error(`Sending ${String(cvText.length)} characters to Gemini...`);

  const result = await extractCvAnalysis(cvText);

  console.error(
    `Valid document from ${result.model}: ` +
      `${String(result.analysis.technicalExperience.length)} technical skill(s), ` +
      `${String(result.analysis.nonTechnicalExperience.length)} non-technical, ` +
      `${String(result.analysis.achievements.length)} achievement(s).`,
  );

  // stdout carries the document and nothing else.
  console.log(JSON.stringify(result.analysis, null, 2));
};

run().catch((error: unknown) => {
  if (error instanceof GeminiCvError) {
    // The code is what a caller would branch on, so it is printed first.
    console.error(`\nCV extraction failed [${error.code}]: ${error.message}`);
    for (const detail of error.details) console.error(`  - ${detail}`);
  } else {
    console.error(`\nCV extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  process.exit(1);
});
