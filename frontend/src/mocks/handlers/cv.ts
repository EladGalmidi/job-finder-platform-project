import { nowIso } from '@/lib/dates';
import { checkCvFile } from '@/lib/validation';
import { ANALYSIS_STEPS, ApiError, asAnalysisJobId, asCvId, asUserId } from '@/types';
import type { AnalysisJob, CV, CVAnalysis } from '@/types';

import { buildAnalysisFromText } from '../cv/buildAnalysis';
import { extractText } from '../cv/extractText';
import { DEMO_CV_ANALYSIS } from '../data/cv';
import { mockDb } from '../db/mockDb';
import type { HandlerContext, MockRoute } from '../transport/router';

/** Wall-clock length of a simulated analysis. */
const ANALYSIS_DURATION_MS = 6_000;

const requireUserId = (context: HandlerContext): string => {
  if (context.userId === null) {
    throw new ApiError('UNAUTHORIZED', 'Not signed in', 401);
  }
  return context.userId;
};

const uploadCv = async (context: HandlerContext): Promise<CV> => {
  const userId = requireUserId(context);
  const file = context.file;

  if (file === undefined) {
    throw new ApiError('VALIDATION_FAILED', 'No file supplied', 422, { file: 'REQUIRED' });
  }

  const check = checkCvFile(file);
  if (!check.ok) {
    const code = check.reason ?? 'VALIDATION_FAILED';
    throw new ApiError(code, `Rejected ${file.name}`, code === 'FILE_TOO_LARGE' ? 413 : 415);
  }

  const cv: CV = {
    id: asCvId(`cv-${String(Date.now())}`),
    userId: asUserId(userId),
    fileName: file.name,
    fileSizeBytes: file.size,
    mimeType: file.type,
    source: 'upload',
    uploadedAt: nowIso(),
    status: 'pending',
  };

  // Read the document now, while the File is still in hand — by the time the
  // analysis job runs, only what is stored here remains.
  const text = await extractText(file);

  mockDb.mutate((draft) => {
    draft.cvs[cv.id] = cv;
    draft.cvText[cv.id] = text;
    const user = draft.users[userId];
    if (user !== undefined) {
      draft.users[userId] = { ...user, activeCvId: cv.id };
    }
  });

  return cv;
};

/**
 * Resolves a CV the caller actually owns.
 *
 * Another user's CV is reported as missing rather than forbidden — a 403 would
 * confirm the id exists. A real backend has to make the same check; leaving it
 * out of the mock would let a whole class of authorisation bug reach the client
 * unnoticed.
 */
const ownedCv = (userId: string, cvId: string): CV => {
  const cv = mockDb.state.cvs[cvId];
  if (cv?.userId !== asUserId(userId)) {
    throw new ApiError('NOT_FOUND', `No CV with id ${cvId}`, 404);
  }
  return cv;
};

const activeCv = (context: HandlerContext): CV | null => {
  const userId = requireUserId(context);
  const user = mockDb.state.users[userId];
  if (user?.activeCvId == null) return null;
  return mockDb.state.cvs[user.activeCvId] ?? null;
};

/**
 * Kicks off an analysis and returns a job id.
 *
 * Progress is computed from elapsed wall-clock time on each poll rather than
 * pushed on a timer, which is why a refresh mid-analysis resumes correctly
 * instead of restarting at zero.
 */
const startAnalysis = (context: HandlerContext): { analysisJobId: string } => {
  const userId = requireUserId(context);
  const cvId = context.params['cvId'] ?? '';

  ownedCv(userId, cvId);

  const job: AnalysisJob = {
    id: asAnalysisJobId(`analysis-job-${String(Date.now())}`),
    cvId: asCvId(cvId),
    status: 'queued',
    progressPercent: 0,
    currentStep: 'parsing',
    completedSteps: [],
    startedAt: nowIso(),
    finishedAt: null,
  };

  mockDb.mutate((draft) => {
    draft.analysisJobs[job.id] = job;
    const cv = draft.cvs[cvId];
    if (cv !== undefined) {
      draft.cvs[cvId] = { ...cv, status: 'analyzing' };
    }
  });

  return { analysisJobId: job.id };
};

/**
 * Builds the analysis for a CV.
 *
 * Derived from the text of the uploaded document. The seeded demo CV has no
 * file behind it, so it keeps its authored fixture — that one is a sample by
 * design, and it is the only case where the analysis is not read from a
 * document.
 */
const buildAnalysis = (cv: CV): CVAnalysis => {
  const text = mockDb.state.cvText[cv.id] ?? '';

  if (text.trim() === '') {
    return { ...DEMO_CV_ANALYSIS, id: `analysis-${cv.id}`, cvId: cv.id, analyzedAt: nowIso() };
  }

  return buildAnalysisFromText(cv, text).analysis;
};

const pollAnalysisJob = (context: HandlerContext): AnalysisJob => {
  const userId = requireUserId(context);
  const id = context.params['analysisJobId'] ?? '';
  const job = mockDb.state.analysisJobs[id];

  if (job === undefined) {
    throw new ApiError('NOT_FOUND', `No analysis job with id ${id}`, 404);
  }

  ownedCv(userId, job.cvId);

  if (job.status === 'succeeded' || job.status === 'failed') return job;

  const elapsed = Date.now() - new Date(job.startedAt).getTime();
  const ratio = Math.min(1, elapsed / ANALYSIS_DURATION_MS);
  const stepIndex = Math.min(ANALYSIS_STEPS.length - 1, Math.floor(ratio * ANALYSIS_STEPS.length));

  const currentStep = ANALYSIS_STEPS[stepIndex] ?? 'parsing';
  const completedSteps = ANALYSIS_STEPS.slice(0, stepIndex);
  const done = ratio >= 1;

  const updated: AnalysisJob = {
    ...job,
    status: done ? 'succeeded' : 'running',
    progressPercent: Math.round(ratio * 100),
    currentStep,
    completedSteps: done ? ANALYSIS_STEPS : completedSteps,
    finishedAt: done ? nowIso() : null,
  };

  mockDb.mutate((draft) => {
    draft.analysisJobs[updated.id] = updated;

    if (!done) return;

    const cv = draft.cvs[updated.cvId];
    if (cv === undefined) return;

    draft.cvs[cv.id] = { ...cv, status: 'ready' };
    draft.analysesByCvId[cv.id] = buildAnalysis(cv);
  });

  return updated;
};

const getAnalysis = (context: HandlerContext): CVAnalysis => {
  const userId = requireUserId(context);
  const cvId = context.params['cvId'] ?? '';

  ownedCv(userId, cvId);
  const analysis = mockDb.state.analysesByCvId[cvId];

  if (analysis === undefined) {
    throw new ApiError('NOT_FOUND', `No analysis for CV ${cvId}`, 404);
  }

  return analysis;
};

const importFromLinkedin = (context: HandlerContext): CV => {
  const userId = requireUserId(context);

  const cv: CV = {
    id: asCvId(`cv-linkedin-${String(Date.now())}`),
    userId: asUserId(userId),
    fileName: 'linkedin-profile.pdf',
    fileSizeBytes: 198_400,
    mimeType: 'application/pdf',
    source: 'linkedin',
    uploadedAt: nowIso(),
    status: 'pending',
  };

  mockDb.mutate((draft) => {
    draft.cvs[cv.id] = cv;
    const user = draft.users[userId];
    if (user !== undefined) {
      draft.users[userId] = { ...user, activeCvId: cv.id };
    }
  });

  return cv;
};

export const cvRoutes: readonly MockRoute[] = [
  { method: 'POST', pattern: '/cv', latency: 'slow', auth: true, handler: uploadCv },
  { method: 'GET', pattern: '/cv/active', latency: 'fast', auth: true, handler: activeCv },
  {
    method: 'POST',
    pattern: '/cv/linkedin-import',
    latency: 'slow',
    auth: true,
    handler: importFromLinkedin,
  },
  {
    method: 'POST',
    pattern: '/cv/:cvId/analyze',
    latency: 'fast',
    auth: true,
    handler: startAnalysis,
  },
  {
    method: 'GET',
    pattern: '/analysis-jobs/:analysisJobId',
    latency: 'fast',
    auth: true,
    handler: pollAnalysisJob,
  },
  {
    method: 'GET',
    pattern: '/cv/:cvId/analysis',
    latency: 'fast',
    auth: true,
    handler: getAnalysis,
  },
];
