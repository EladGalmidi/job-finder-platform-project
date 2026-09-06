import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { strToU8, zipSync } from 'fflate';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../app.js';
import { __setEnv, loadEnv } from '../config/env.js';
import { closeDatabase, createDatabase, database } from '../db/client.js';
import { analysisJobs, cvs, mockScoringResults, mockScoringSubmissions } from '../db/schema.js';
import { GeminiCvError } from '../gemini/cvAnalysisContract.js';
import type { CvAnalysis } from '../gemini/cvAnalysisContract.js';
import type { CvExtractionResult } from '../gemini/extractCvAnalysis.js';
import { MOCK_SCORE } from '../scoring/mockScoringService.js';
import { keyForUpload, putFile } from '../storage/files.js';
import { runAnalysis, type CvExtractor } from './cv.js';

/**
 * Cover for the CV run and the score it produces.
 *
 * Gemini is stubbed everywhere. The point of these tests is the wiring either
 * side of it — that a validated document reaches the scoring service, that a
 * failure leaves no score behind, and that the endpoint serves what was stored.
 */

const testEnv = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL:
    process.env['DATABASE_URL'] ?? 'postgres://jobmatch:jobmatch@localhost:5433/jobmatch',
  SESSION_SECRET: 'a-test-secret-that-is-long-enough-to-pass',
  LOG_LEVEL: 'fatal',
});

const databaseReachable = await (async (): Promise<boolean> => {
  const { sql } = createDatabase(testEnv.DATABASE_URL, 1);
  try {
    await sql`select 1`;
    return true;
  } catch {
    return false;
  } finally {
    await sql.end();
  }
})();

/**
 * The smallest archive mammoth will read as a Word document.
 *
 * Built here rather than committed as a binary fixture so the text under test
 * is visible in the test that uses it.
 */
const docxWith = (text: string): Buffer =>
  Buffer.from(
    zipSync({
      '[Content_Types].xml': strToU8(
        '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
          '</Types>',
      ),
      '_rels/.rels': strToU8(
        '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
          '</Relationships>',
      ),
      'word/document.xml': strToU8(
        '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
          `<w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`,
      ),
    }),
  );

const analysisFor = (skill: string): CvAnalysis => ({
  personalInformation: { fullName: 'Rin Kobayashi' },
  technicalExperience: [
    {
      skill,
      period: { startDate: '2019', endDate: null, isCurrent: true },
      experienceDuration: { unit: 'years', value: null },
      usageDepth: { level: 'working', activities: ['maintain'] },
      evidence: [{ sourceExcerpt: `Maintained ${skill}.`, employer: null, role: null }],
    },
  ],
  nonTechnicalExperience: [],
  achievements: [],
  other: {},
});

/** A stub extractor that succeeds with `analysis`. */
const succeeds =
  (analysis: CvAnalysis): CvExtractor =>
  (text: string): Promise<CvExtractionResult> =>
    Promise.resolve({ analysis, model: 'stub', inputCharacters: text.length });

/** A stub extractor that fails the way `code` describes. */
const fails =
  (code: 'GEMINI_SCHEMA_VIOLATION' | 'GEMINI_NOT_CONFIGURED' | 'GEMINI_INVALID_JSON'): CvExtractor =>
  () =>
    Promise.reject(new GeminiCvError(code, `stubbed ${code}`, ['stubbed detail']));

describe.skipIf(!databaseReachable)('CV scoring', () => {
  let app: FastifyInstance;
  let cookie: string;
  let userId: string;
  let otherCookie: string;

  const signUp = async (): Promise<{ cookie: string; userId: string }> => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        fullName: 'Score Tester',
        email: `score+${String(Date.now())}-${String(Math.random()).slice(2, 8)}@example.com`,
        password: 'a-long-enough-password',
      },
    });

    return {
      cookie: String(response.headers['set-cookie']).split(';')[0] ?? '',
      userId: response.json<{ user: { id: string } }>().user.id,
    };
  };

  /** Puts a real file in storage and records it, as an upload would. */
  const createCv = async (bytes: Buffer, fileName = 'cv.docx'): Promise<string> => {
    const cvId = `cv-${randomUUID()}`;
    const key = keyForUpload(fileName);
    await putFile(key, bytes);

    await database()
      .db.insert(cvs)
      .values({
        id: cvId,
        userId,
        fileName,
        fileSize: bytes.byteLength,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        storageKey: key,
      });

    return cvId;
  };

  const analyse = async (cvId: string, extract: CvExtractor): Promise<void> => {
    const jobId = `job-${randomUUID()}`;
    await database().db.insert(analysisJobs).values({ id: jobId, cvId, userId, status: 'queued' });

    await runAnalysis(jobId, cvId, extract);
  };

  const submissionFor = (cvId: string) =>
    database()
      .db.select()
      .from(mockScoringSubmissions)
      .where(eq(mockScoringSubmissions.cvId, cvId));

  const scoreRowFor = (cvId: string) =>
    database().db.select().from(mockScoringResults).where(eq(mockScoringResults.cvId, cvId));

  beforeAll(async () => {
    __setEnv(testEnv);
    app = await buildApp();
    await app.ready();

    ({ cookie, userId } = await signUp());
    ({ cookie: otherCookie } = await signUp());
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
    __setEnv(undefined);
  });

  it('stores the validated document and creates a score', async () => {
    const cvId = await createCv(docxWith('Maintained Kubernetes clusters for four years.'));

    await analyse(cvId, succeeds(analysisFor('Kubernetes')));

    const stored = await submissionFor(cvId);
    expect(stored).toHaveLength(1);
    // The document is kept exactly as validated, not summarised on the way in.
    expect((stored[0]?.document as CvAnalysis).technicalExperience[0]?.skill).toBe('Kubernetes');

    const score = await scoreRowFor(cvId);
    expect(score[0]?.score).toBe(MOCK_SCORE);
    expect(MOCK_SCORE).toBe(88);
  });

  it('serves that score over the API', async () => {
    const cvId = await createCv(docxWith('Maintained Terraform modules.'));
    await analyse(cvId, succeeds(analysisFor('Terraform')));

    const response = await app.inject({
      method: 'GET',
      url: `/cv/${cvId}/score`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ score: 88 });
  });

  it('leaves no score when the document fails schema validation', async () => {
    const cvId = await createCv(docxWith('Some CV text that Gemini will mangle.'));

    await analyse(cvId, fails('GEMINI_SCHEMA_VIOLATION'));

    // Nothing stored, so nothing scored. The foreign key would refuse the
    // second write even if the first were skipped by mistake.
    expect(await submissionFor(cvId)).toHaveLength(0);
    expect(await scoreRowFor(cvId)).toHaveLength(0);

    const response = await app.inject({
      method: 'GET',
      url: `/cv/${cvId}/score`,
      headers: { cookie },
    });
    expect(response.statusCode).toBe(404);
  });

  it('leaves no score when Gemini is not configured', async () => {
    const cvId = await createCv(docxWith('Another CV, on a deployment with no key.'));

    await analyse(cvId, fails('GEMINI_NOT_CONFIGURED'));

    expect(await scoreRowFor(cvId)).toHaveLength(0);
  });

  it('still completes the rest of the analysis when Gemini fails', async () => {
    const cvId = await createCv(docxWith('Experience with Docker and Python across two roles.'));

    await analyse(cvId, fails('GEMINI_INVALID_JSON'));

    // The CV page reads this, and it must not depend on Gemini.
    const analysis = await app.inject({
      method: 'GET',
      url: `/cv/${cvId}/analysis`,
      headers: { cookie },
    });

    expect(analysis.statusCode).toBe(200);
    expect(analysis.json<{ score: number }>().score).toBeGreaterThanOrEqual(0);
  });

  it('never calls Gemini when no text could be read', async () => {
    // A .pdf that is not a PDF: extraction fails before Gemini is reached.
    const cvId = await createCv(Buffer.from('not a pdf at all'), 'broken.pdf');

    let called = false;
    await analyse(cvId, () => {
      called = true;
      return Promise.reject(new Error('should not be reached'));
    });

    expect(called).toBe(false);
    expect(await scoreRowFor(cvId)).toHaveLength(0);
  });

  it('answers 404 for a CV that has not been scored', async () => {
    const cvId = await createCv(docxWith('Not analysed yet.'));

    const response = await app.inject({
      method: 'GET',
      url: `/cv/${cvId}/score`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(404);
  });

  it('refuses to serve another user a score', async () => {
    const cvId = await createCv(docxWith('Private CV content.'));
    await analyse(cvId, succeeds(analysisFor('Ansible')));

    const response = await app.inject({
      method: 'GET',
      url: `/cv/${cvId}/score`,
      headers: { cookie: otherCookie },
    });

    // 404 rather than 403: a stranger should not learn the CV exists.
    expect(response.statusCode).toBe(404);
    expect(response.json<{ code: string }>().code).toBe('NOT_FOUND');
  });

  it('requires a session', async () => {
    const cvId = await createCv(docxWith('Public request, no cookie.'));

    const response = await app.inject({ method: 'GET', url: `/cv/${cvId}/score` });

    expect(response.statusCode).toBe(401);
  });
});
