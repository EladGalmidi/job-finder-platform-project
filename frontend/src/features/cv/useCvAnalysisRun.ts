import { useEffect, useRef, useState } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectAutoExportJson } from '@/features/ui/uiSlice';
import type { AnalysisJob, AnalysisJobId, CvId } from '@/types';

import {
  fetchCvAnalysis,
  pollCvAnalysis,
  selectAnalysisJob,
  selectCvById,
  startCvAnalysis,
} from './cvSlice';
import { exportCvDocument } from './exportCvDocument';

const POLL_INTERVAL_MS = 500;

export interface CvAnalysisRun {
  readonly job: AnalysisJob | null;
  readonly progressPercent: number;
}

export interface CvAnalysisRunOptions {
  /** The CV to analyse. Null holds the run until one exists. */
  readonly cvId: CvId | null;
  /** Called once, after the finished analysis has been fetched into the store. */
  readonly onComplete: () => void;
  /** Reuses an already-started job instead of queueing a new one. */
  readonly existingJobId?: AnalysisJobId | null;
  /** Reports the job id as soon as it is issued, so a caller can persist it. */
  readonly onJobStarted?: (analysisJobId: AnalysisJobId) => void;
}

/**
 * Runs a CV analysis: queue it, poll until it settles, fetch the result.
 *
 * Shared by onboarding and the replace-CV page so the two cannot drift. Both of
 * the subtle bugs this logic has had before are encoded here rather than in one
 * caller:
 *
 * - The poll interval depends only on values that are stable for its lifetime.
 *   Depending on a navigation callback tore the timer down and rebuilt it on
 *   every render, so it rarely fired.
 * - Completion is driven by rendered status, not from inside the poll callback.
 *   Gating on a closure flag let the re-render caused by the succeeding poll
 *   cancel the transition before it ran.
 */
export const useCvAnalysisRun = ({
  cvId,
  onComplete,
  existingJobId = null,
  onJobStarted,
}: CvAnalysisRunOptions): CvAnalysisRun => {
  const dispatch = useAppDispatch();
  const job = useAppSelector(selectAnalysisJob);

  /*
   * The JSON export belongs to finishing an analysis, so it lives here with the
   * rest of that sequence. It was previously wired into one caller, which meant
   * replacing a CV from the dashboard produced a file and finishing the same
   * analysis during onboarding silently did not — the exact drift this hook
   * exists to prevent.
   */
  const autoExportJson = useAppSelector(selectAutoExportJson);
  const cv = useAppSelector((state) => selectCvById(state, cvId));

  // Read at completion time rather than listed as effect dependencies, so
  // toggling the setting mid-analysis cannot restart the run.
  const exportRef = useRef({ autoExportJson, fileName: cv?.fileName });
  exportRef.current = { autoExportJson, fileName: cv?.fileName };

  /**
   * The id of the job this hook started.
   *
   * It has to be held here: `startCvAnalysis.fulfilled` has no reducer case, so
   * the store's `analysisJob` stays null until the first poll lands — and the
   * poll needs an id. Reading the id off the store alone deadlocks, which is
   * exactly how the replace-CV flow first hung at 0%.
   */
  const [startedJobId, setStartedJobId] = useState<AnalysisJobId | null>(null);

  // StrictMode double-invokes effects in development; without this guard two
  // analyses would be queued for a single upload.
  const startedRef = useRef(false);
  const completedRef = useRef(false);

  // Held in refs so a caller can pass inline closures without restarting the
  // run on every render.
  const onCompleteRef = useRef(onComplete);
  const onJobStartedRef = useRef(onJobStarted);
  onCompleteRef.current = onComplete;
  onJobStartedRef.current = onJobStarted;

  useEffect(() => {
    if (cvId === null || existingJobId !== null || startedRef.current) return;
    startedRef.current = true;

    void dispatch(startCvAnalysis(cvId)).then((result) => {
      if (startCvAnalysis.fulfilled.match(result)) {
        setStartedJobId(result.payload.analysisJobId);
        onJobStartedRef.current?.(result.payload.analysisJobId);
      }
    });
  }, [cvId, existingJobId, dispatch]);

  const activeJobId = existingJobId ?? startedJobId ?? job?.id ?? null;
  const isSettled = job?.status === 'succeeded' || job?.status === 'failed';

  useEffect(() => {
    if (activeJobId === null || isSettled) return;

    const timer = setInterval(() => {
      void dispatch(pollCvAnalysis(activeJobId));
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [activeJobId, isSettled, dispatch]);

  useEffect(() => {
    if (job?.status !== 'succeeded' || cvId === null || completedRef.current) return;
    completedRef.current = true;

    void dispatch(fetchCvAnalysis(cvId)).then(async () => {
      // Awaited before handing control back: onComplete navigates away, and the
      // download has to be issued while this component is still mounted.
      if (exportRef.current.autoExportJson) {
        await exportCvDocument(cvId, exportRef.current.fileName ?? 'cv');
      }

      onCompleteRef.current();
    });
  }, [job?.status, cvId, dispatch]);

  return { job, progressPercent: job?.progressPercent ?? 0 };
};
