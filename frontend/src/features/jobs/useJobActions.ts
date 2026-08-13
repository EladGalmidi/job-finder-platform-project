import { useCallback } from 'react';

import { useAppDispatch } from '@/app/hooks';
import { applyToJob, saveJob } from '@/features/applications/applicationsSlice';
import { toastPushed } from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';
import { createLogger } from '@/lib/logger';
import type { Job, JobId } from '@/types';

const log = createLogger('jobActions');

export interface JobActions {
  save: (job: Job) => void;
  apply: (job: Job) => void;
  share: (job: Job) => void;
}

export const jobDetailPath = (jobId: JobId): string => `/dashboard/jobs/${jobId}`;

/**
 * Save, apply and share, wired once.
 *
 * Every surface that renders a JobCard uses this, so the three actions behave
 * identically on the dashboard, in the list and inside the detail drawer, and
 * each one gives feedback rather than silently mutating state.
 */
export const useJobActions = (): JobActions => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const save = useCallback(
    (job: Job) => {
      void dispatch(saveJob(job.id)).then((result) => {
        if (saveJob.fulfilled.match(result)) {
          dispatch(
            toastPushed({ severity: 'success', title: t('jobs.toastSaved', { title: job.title }) }),
          );
          return;
        }
        dispatch(toastPushed({ severity: 'danger', title: t('jobs.actionFailed') }));
      });
    },
    [dispatch, t],
  );

  const apply = useCallback(
    (job: Job) => {
      void dispatch(applyToJob(job.id)).then((result) => {
        if (applyToJob.fulfilled.match(result)) {
          dispatch(
            toastPushed({
              severity: 'success',
              title: t('jobs.toastApplied', { title: job.title }),
            }),
          );
          return;
        }
        dispatch(toastPushed({ severity: 'danger', title: t('jobs.actionFailed') }));
      });
    },
    [dispatch, t],
  );

  /**
   * Shares the deep link to the job, which only works because the detail view is
   * route-backed rather than local drawer state.
   */
  const share = useCallback(
    (job: Job) => {
      const url = `${window.location.origin}${jobDetailPath(job.id)}`;

      const copy = async (): Promise<void> => {
        if (typeof navigator.share === 'function') {
          await navigator.share({ title: job.title, url });
          return;
        }
        await navigator.clipboard.writeText(url);
        dispatch(toastPushed({ severity: 'info', title: t('jobs.toastShared') }));
      };

      void copy().catch((error: unknown) => {
        // A user dismissing the native share sheet rejects the promise; that is
        // a cancellation, not a failure worth reporting.
        if (error instanceof DOMException && error.name === 'AbortError') return;
        log.warn('share failed', { error: String(error) });
        dispatch(toastPushed({ severity: 'danger', title: t('jobs.toastShareFailed') }));
      });
    },
    [dispatch, t],
  );

  return { save, apply, share };
};
