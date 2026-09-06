import { randomUUID } from 'node:crypto';
import { count, desc, eq } from 'drizzle-orm';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';
import { z } from 'zod';

import { buildAnalysis, type SkillDemand } from '../cv/buildAnalysis.js';
import { extractText } from '../cv/extractText.js';
import { database } from '../db/client.js';
import { analysisJobs, cvAnalyses, cvs, jobSkills, jobs, skills, users } from '../db/schema.js';
import { GeminiCvError } from '../gemini/cvAnalysisContract.js';
import { extractCvAnalysis } from '../gemini/extractCvAnalysis.js';
import type { CvExtractionResult } from '../gemini/extractCvAnalysis.js';
import { ApiError, notFound } from '../http/errors.js';
import { scoringService } from '../scoring/mockScoringService.js';
import { keyForUpload, putFile, getFile } from '../storage/files.js';

/** Matches the frontend's MAX_CV_BYTES. */
const MAX_CV_BYTES = 5 * 1024 * 1024;

const ACCEPTED = /\.(pdf|docx)$/i;

/*
 * The stages the progress list renders, in the order it renders them.
 *
 * These keys are the frontend's ANALYSIS_STEPS verbatim. They have to match
 * exactly: the UI ticks a step by looking for its own key in completedSteps, so
 * a server that reports "extracting" where the UI expects "extractingSkills"
 * leaves every stage after the first permanently unticked.
 */
const STEPS = [
  'parsing',
  'extractingSkills',
  'scoringStructure',
  'comparingMarket',
  'matchingJobs',
  'buildingRecommendations',
] as const;

/*
 * Default for runAnalysis's logger parameter. The route always passes the
 * request's own logger; this exists so a direct call in a test does not have to
 * invent one, and so a missing argument cannot throw inside a catch block.
 */
const silentLog = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
} as unknown as FastifyBaseLogger;

const serializeCv = (row: typeof cvs.$inferSelect) => ({
  id: row.id,
  userId: row.userId,
  fileName: row.fileName,
  fileSizeBytes: row.fileSize,
  mimeType: row.mimeType,
  source: 'upload',
  uploadedAt: row.uploadedAt.toISOString(),
  status: row.extractedText === null ? 'pending' : 'ready',
});

const serializeJob = (row: typeof analysisJobs.$inferSelect) => ({
  id: row.id,
  cvId: row.cvId,
  status: row.status,
  currentStep: row.currentStep,
  completedSteps: row.completedSteps,
  progressPercent: row.progressPercent,
  ...(row.errorCode === null ? {} : { errorCode: row.errorCode }),
});

export const registerCvRoutes = (app: FastifyInstance): void => {
  app.post('/cv', async (request, reply) => {
    const user = request.requireUser();
    const upload = await request.file();

    if (upload === undefined) {
      throw new ApiError('VALIDATION_FAILED', 'No file was included in the request', 422);
    }

    if (!ACCEPTED.test(upload.filename)) {
      throw new ApiError(
        'UNSUPPORTED_FILE_TYPE',
        'Only PDF and DOCX files can be read',
        415,
      );
    }

    const bytes = await upload.toBuffer();

    /*
     * Size is checked after buffering because @fastify/multipart enforces its
     * own limit while streaming; this is the second line, and the one that
     * produces the coded error the UI knows how to render.
     */
    if (bytes.byteLength > MAX_CV_BYTES) {
      throw new ApiError('FILE_TOO_LARGE', 'That file is larger than 5 MB', 413);
    }

    const key = keyForUpload(upload.filename);
    await putFile(key, bytes);

    const { db } = database();

    const inserted = await db
      .insert(cvs)
      .values({
        id: `cv-${randomUUID()}`,
        userId: user.id,
        fileName: upload.filename,
        fileSize: bytes.byteLength,
        mimeType: upload.mimetype,
        storageKey: key,
      })
      .returning();

    const row = inserted[0];
    if (row === undefined) throw new ApiError('SERVER_ERROR', 'Could not record the upload', 500);

    // The CV becomes active immediately. Analysis follows, and the dashboard
    // reads whichever CV is current rather than waiting for a score.
    await db.update(users).set({ activeCvId: row.id }).where(eq(users.id, user.id));

    return reply.status(201).send(serializeCv(row));
  });

  app.get('/cv/active', async (request) => {
    const user = request.requireUser();
    if (user.activeCvId === null) return null;

    const rows = await database()
      .db.select()
      .from(cvs)
      .where(eq(cvs.id, user.activeCvId))
      .limit(1);

    return rows[0] === undefined ? null : serializeCv(rows[0]);
  });

  app.post('/cv/:cvId/analyze', async (request, reply) => {
    const user = request.requireUser();
    const { cvId } = z.object({ cvId: z.string() }).parse(request.params);
    const { db } = database();

    const owned = await db.select().from(cvs).where(eq(cvs.id, cvId)).limit(1);
    const cv = owned[0];

    // Ownership is checked here, not assumed from the id. Without it any signed
    // in user could analyse — and then read — anyone else's CV by guessing.
    if (cv?.userId !== user.id) throw notFound(`CV ${cvId}`);

    const jobId = `job-${randomUUID()}`;
    await db.insert(analysisJobs).values({ id: jobId, cvId, userId: user.id, status: 'queued' });

    /*
     * Deliberately not awaited. The response returns the job id straight away
     * and the frontend polls, which is the contract it already implements.
     *
     * In-process for now: a real deployment runs this on a queue so a restart
     * does not lose the work and one slow OCR does not block the server. The
     * job row exists precisely so that move needs no API change.
     */
    void runAnalysis(jobId, cvId, extractCvAnalysis, request.log).catch((error: unknown) => {
      request.log.error({ err: error, jobId }, 'analysis run failed outside its handler');
    });

    return reply.status(202).send({ analysisJobId: jobId });
  });

  app.get('/analysis-jobs/:jobId', async (request) => {
    const user = request.requireUser();
    const { jobId } = z.object({ jobId: z.string() }).parse(request.params);

    const rows = await database()
      .db.select()
      .from(analysisJobs)
      .where(eq(analysisJobs.id, jobId))
      .limit(1);

    const row = rows[0];
    if (row?.userId !== user.id) throw notFound(`Analysis job ${jobId}`);

    return serializeJob(row);
  });

  app.get('/cv/:cvId/analysis', async (request) => {
    const user = request.requireUser();
    const { cvId } = z.object({ cvId: z.string() }).parse(request.params);

    const rows = await database()
      .db.select()
      .from(cvAnalyses)
      .where(eq(cvAnalyses.cvId, cvId))
      .limit(1);

    const row = rows[0];
    if (row?.userId !== user.id) throw notFound(`Analysis for ${cvId}`);

    return row.payload;
  });

  /**
   * The match score for a CV, as returned by the scoring service.
   *
   * A 404 here means "not scored yet", which is an ordinary state: the score
   * only exists once Gemini has read the CV and the document has been stored.
   * The UI treats it as nothing to show rather than as a failure.
   */
  app.get('/cv/:cvId/score', async (request) => {
    const user = request.requireUser();
    const { cvId } = z.object({ cvId: z.string() }).parse(request.params);

    const rows = await database().db.select().from(cvs).where(eq(cvs.id, cvId)).limit(1);
    const cv = rows[0];

    // Ownership before existence, as everywhere else here: otherwise the reply
    // tells a stranger whether someone else's CV has been scored.
    if (cv?.userId !== user.id) throw notFound(`CV ${cvId}`);

    const result = await scoringService.scoreFor(cvId);
    if (result === null) throw notFound(`Score for ${cvId}`);

    return { score: result.score };
  });

  /** The CV as a machine-readable document, for export into another system. */
  app.get('/cv/:cvId/document', async (request) => {
    const user = request.requireUser();
    const { cvId } = z.object({ cvId: z.string() }).parse(request.params);

    const rows = await database().db.select().from(cvs).where(eq(cvs.id, cvId)).limit(1);
    const cv = rows[0];
    if (cv?.userId !== user.id) throw notFound(`CV ${cvId}`);

    if (cv.extractedText === null) {
      throw new ApiError('CV_NO_TEXT', 'No text has been read from this CV', 422);
    }

    const analysis = await database()
      .db.select()
      .from(cvAnalyses)
      .where(eq(cvAnalyses.cvId, cvId))
      .limit(1);

    return {
      schemaVersion: '1.0',
      source: {
        fileName: cv.fileName,
        mimeType: cv.mimeType,
        fileSizeBytes: cv.fileSize,
        uploadedAt: cv.uploadedAt.toISOString(),
      },
      extraction: cv.extraction,
      content: { text: cv.extractedText },
      parsed: analysis[0]?.payload ?? null,
    };
  });
};

const advance = async (jobId: string, step: (typeof STEPS)[number]): Promise<void> => {
  const index = STEPS.indexOf(step);

  await database()
    .db.update(analysisJobs)
    .set({
      status: 'running',
      currentStep: step,
      completedSteps: STEPS.slice(0, index),
      progressPercent: Math.round((index / STEPS.length) * 100),
    })
    .where(eq(analysisJobs.id, jobId));
};

/**
 * Reads a CV's text with Gemini and hands the result to the scoring service.
 *
 * Isolated from the rest of the run on purpose. Everything the CV page renders
 * comes from buildAnalysis, which does not need this and must not be held
 * hostage to it — an outage at Gemini, a missing credential or a document that
 * fails validation costs the user a match score, not their whole analysis.
 *
 * Returns nothing. The only visible effect is that a score exists afterwards,
 * or does not.
 */
const submitForScoring = async (
  cvId: string,
  userId: string,
  text: string,
  extract: CvExtractor,
  log: FastifyBaseLogger,
): Promise<void> => {
  try {
    // Throws unless the reply parsed as JSON and passed schema validation, so
    // everything below this line has a document that meets the contract.
    const { analysis } = await extract(text);

    // Storing the document and creating the score are one call because they are
    // one event for the service on the far side. It writes the document first;
    // a foreign key stops a score existing without one.
    await scoringService.submit({ cvId, userId, analysis });
  } catch (error) {
    if (error instanceof GeminiCvError) {
      /*
       * An absent credential is a deployment choosing not to run extraction,
       * not a fault, so it is not logged as one. Everything else is worth
       * seeing: a schema violation means the prompt has regressed.
       */
      const level = error.code === 'GEMINI_NOT_CONFIGURED' ? 'info' : 'warn';
      log[level]({ cvId, code: error.code, details: error.details }, 'no score created');
      return;
    }

    // A transport failure — Gemini answering 503, most often — arrives here
    // uncoded, because the SDK throws its own error type.
    log.warn({ cvId, err: error }, 'scoring submission failed');
  }
};

/** The Gemini call, as a parameter, so tests can run this path without one. */
export type CvExtractor = (text: string) => Promise<CvExtractionResult>;

/**
 * Reads the CV, scores it, and records the result.
 *
 * Failures are written to the job row rather than thrown away: the frontend
 * polls this, and a run that simply stops leaves a progress ring spinning
 * forever with nothing to explain it.
 */
export const runAnalysis = async (
  jobId: string,
  cvId: string,
  extract: CvExtractor = extractCvAnalysis,
  log: FastifyBaseLogger = silentLog,
): Promise<void> => {
  const { db } = database();

  try {
    await advance(jobId, 'parsing');

    const rows = await db.select().from(cvs).where(eq(cvs.id, cvId)).limit(1);
    const cv = rows[0];
    if (cv === undefined) throw new ApiError('NOT_FOUND', `CV ${cvId} disappeared`, 404);

    await advance(jobId, 'extractingSkills');

    const bytes = await getFile(cv.storageKey);
    const extraction = await extractText(bytes, cv.fileName);

    if (extraction.outcome !== 'ok' || extraction.text.trim() === '') {
      await db
        .update(cvs)
        .set({ extraction: { ...extraction.diagnostics, detail: extraction.detail } })
        .where(eq(cvs.id, cvId));

      await db
        .update(analysisJobs)
        .set({
          status: 'failed',
          errorCode: extraction.outcome === 'unsupported' ? 'UNSUPPORTED_FILE_TYPE' : 'CV_NO_TEXT',
          errorDetail: extraction.detail ?? null,
          // Progress is left where it stopped. Reporting 100 drew a full ring
          // over a run that had failed, which reads as "done" and explains
          // nothing.
          finishedAt: new Date(),
        })
        .where(eq(analysisJobs.id, jobId));

      return;
    }

    await db
      .update(cvs)
      .set({ extractedText: extraction.text, extraction: extraction.diagnostics })
      .where(eq(cvs.id, cvId));

    await advance(jobId, 'scoringStructure');

    /*
     * Awaited rather than left running: the job must not report success while
     * the score it implies is still being written, or a UI that fetches on
     * completion races it and shows nothing.
     */
    await submitForScoring(cvId, cv.userId, extraction.text, extract, log);

    const catalogue = await db
      .select({ id: skills.id, name: skills.name, aliases: skills.aliases })
      .from(skills);

    const demandRows = await db
      .select({ skillId: jobSkills.skillId, name: skills.name, jobs: count() })
      .from(jobSkills)
      .innerJoin(skills, eq(skills.id, jobSkills.skillId))
      .groupBy(jobSkills.skillId, skills.name);

    const totals = await db.select({ value: count() }).from(jobs);
    const requirementRows = await db
      .select({ jobId: jobSkills.jobId, skillId: jobSkills.skillId })
      .from(jobSkills);

    const byJob = new Map<string, string[]>();
    for (const row of requirementRows) {
      byJob.set(row.jobId, [...(byJob.get(row.jobId) ?? []), row.skillId]);
    }

    await advance(jobId, 'comparingMarket');

    const analysis = buildAnalysis({
      cvId,
      text: extraction.text,
      catalogue,
      demand: demandRows satisfies SkillDemand[],
      totalJobs: totals[0]?.value ?? 0,
      jobRequirements: [...byJob.values()],
    });

    await db
      .insert(cvAnalyses)
      .values({ cvId, userId: cv.userId, payload: analysis })
      .onConflictDoUpdate({
        target: cvAnalyses.cvId,
        set: { payload: analysis, createdAt: new Date() },
      });

    await db
      .update(analysisJobs)
      .set({
        status: 'succeeded',
        currentStep: 'buildingRecommendations',
        completedSteps: [...STEPS],
        progressPercent: 100,
        finishedAt: new Date(),
      })
      .where(eq(analysisJobs.id, jobId));
  } catch (error) {
    await db
      .update(analysisJobs)
      .set({
        status: 'failed',
        errorCode: 'SERVER_ERROR',
        errorDetail: String(error),
        finishedAt: new Date(),
      })
      .where(eq(analysisJobs.id, jobId));
  }
};

/** Most recent first, used by the dashboard's CV history. */
export const recentCvs = (userId: string) =>
  database().db.select().from(cvs).where(eq(cvs.userId, userId)).orderBy(desc(cvs.uploadedAt));
