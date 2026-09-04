import { Navigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/Button/Button';
import { ProgressRing } from '@/components/ui/ProgressRing/ProgressRing';
import {
  onboardingAnalysisJobSet,
  selectOnboarding,
} from '@/features/auth/authSlice';
import { useCvAnalysisRun } from '@/features/cv/useCvAnalysisRun';
import { useTranslation } from '@/i18n/useTranslation';
import { ANALYSIS_STEP_LABEL } from '@/lib/labels';
import { cx } from '@/lib/cx';
import { ANALYSIS_STEPS } from '@/types';

import { stepPath, useOnboardingSteps } from '../useOnboardingSteps';
import styles from '../Onboarding.module.css';

export const AnalyzingStep = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { goTo } = useOnboardingSteps();

  const onboarding = useAppSelector(selectOnboarding);

  const { cvId, analysisJobId } = onboarding;

  // Start, poll and completion all live in the shared hook, so onboarding and
  // the replace-CV page cannot drift apart. The job id is persisted into
  // onboarding state, which is what lets a refresh mid-analysis resume the same
  // run rather than queueing a second one.
  const { job } = useCvAnalysisRun({
    cvId,
    existingJobId: analysisJobId,
    onJobStarted: (id) => dispatch(onboardingAnalysisJobSet(id)),
    onComplete: () => {
      goTo('results');
    },
  });

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
