import { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/Button/Button';
import { ProgressRing } from '@/components/ui/ProgressRing/ProgressRing';
import {
  onboardingAnalysisJobSet,
  selectOnboarding,
} from '@/features/auth/authSlice';
import {
  fetchCvAnalysis,
  pollCvAnalysis,
  selectAnalysisJob,
  startCvAnalysis,
} from '@/features/cv/cvSlice';
import { useTranslation } from '@/i18n/useTranslation';
import { ANALYSIS_STEP_LABEL } from '@/lib/labels';
import { cx } from '@/lib/cx';
import { ANALYSIS_STEPS } from '@/types';

import { stepPath, useOnboardingSteps } from '../useOnboardingSteps';
import styles from '../Onboarding.module.css';

const POLL_INTERVAL_MS = 500;

export const AnalyzingStep = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { goTo } = useOnboardingSteps();

  const onboarding = useAppSelector(selectOnboarding);
  const job = useAppSelector(selectAnalysisJob);

  const { cvId, analysisJobId } = onboarding;

  // StrictMode double-invokes effects in development; without this guard two
  // analyses would be queued for a single upload.
  const startedRef = useRef(false);

  useEffect(() => {
    if (cvId === null || startedRef.current) return;
    startedRef.current = true;

    void dispatch(startCvAnalysis(cvId)).then((result) => {
      if (startCvAnalysis.fulfilled.match(result)) {
        dispatch(onboardingAnalysisJobSet(result.payload.analysisJobId));
      }
    });
  }, [cvId, dispatch]);

  const isSettled = job?.status === 'succeeded' || job?.status === 'failed';

  /**
   * Polls the analysis job until it settles.
   *
   * Deliberately depends only on values that are stable for the life of the
   * poll. An earlier version also depended on the navigation callback, and any
   * change in its identity tore the interval down and restarted it, so the timer
   * rarely fired. The interval is cleared on unmount, so navigating away
   * mid-analysis stops the requests rather than leaving a timer running.
   */
  useEffect(() => {
    if (analysisJobId === null || isSettled) return;

    const timer = setInterval(() => {
      void dispatch(pollCvAnalysis(analysisJobId));
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [analysisJobId, isSettled, dispatch]);

  /**
   * Advances once the job reports success.
   *
   * Completion is driven by rendered state rather than from inside the poll
   * callback: gating navigation on a closure flag meant a re-render triggered by
   * the very poll that succeeded could cancel the transition before it ran.
   */
  const completedRef = useRef(false);

  useEffect(() => {
    if (job?.status !== 'succeeded' || cvId === null || completedRef.current) return;
    completedRef.current = true;

    void dispatch(fetchCvAnalysis(cvId)).then(() => {
      goTo('results');
    });
  }, [job?.status, cvId, dispatch, goTo]);

  // Reaching this step without a CV means the user skipped upload; results is
  // the only sensible destination.
  if (cvId === null) {
    return <Navigate to={stepPath('results')} replace />;
  }

  const progress = job?.progressPercent ?? 0;
  const currentIndex = job === null ? 0 : ANALYSIS_STEPS.indexOf(job.currentStep);
  const isDone = job?.status === 'succeeded';
  const isFailed = job?.status === 'failed';

  return (
    <section className={styles.card}>
      <div className={styles.analyzing}>
        <div>
          <h1 className={styles.stepTitle}>
            {isDone ? t('onboarding.analyzing.complete') : t('onboarding.analyzing.title')}
          </h1>
          <p className={styles.stepSubtitle}>{t('onboarding.analyzing.subtitle')}</p>
        </div>

        <div className={styles.analyzingRing}>
          <ProgressRing
            value={progress}
            size={168}
            thickness={12}
            label={t('onboarding.analyzing.title')}
            caption={t('onboarding.analyzing.subtitle')}
          >
            <span style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>
              {Math.round(progress)}%
            </span>
          </ProgressRing>
        </div>

        {/*
          The stage list mirrors the ring, so it is announced politely as a whole
          rather than firing an alert on every tick.
        */}
        <ol className={styles.analyzingSteps} aria-live="polite">
          {ANALYSIS_STEPS.map((step, index) => {
            const done = isDone || index < currentIndex;
            const active = !isDone && index === currentIndex;

            return (
              <li
                key={step}
                className={cx(
                  styles.analyzingStep,
                  done && styles.analyzingStepDone,
                  active && styles.analyzingStepActive,
                )}
              >
                <span className={styles.analyzingMark} aria-hidden="true">
                  {done ? '✓' : index + 1}
                </span>
                {t(ANALYSIS_STEP_LABEL[step])}
              </li>
            );
          })}
        </ol>

        {isFailed ? (
          <div>
            <p className={styles.fieldError} role="alert">
              {t('onboarding.analyzing.failed')}
            </p>
            <Button variant="secondary" onClick={() => goTo('cv')}>
              {t('common.retry')}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
};
