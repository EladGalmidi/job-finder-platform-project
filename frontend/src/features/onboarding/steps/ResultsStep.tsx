import { useEffect, useState } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { MatchScore } from '@/components/domain/MatchScore/MatchScore';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Skeleton } from '@/components/ui/Skeleton/Skeleton';
import { completeOnboarding, selectOnboarding } from '@/features/auth/authSlice';
import { fetchCvAnalysis, selectActiveAnalysis, selectAnalysisForCv } from '@/features/cv/cvSlice';
import {
  fetchDashboardMetrics,
  selectDashboardMetrics,
  selectMetricsStatus,
} from '@/features/insights/insightsSlice';
import { useTranslation } from '@/i18n/useTranslation';
import { cx } from '@/lib/cx';
import { PRIORITY_LABEL, SEVERITY_LABEL } from '@/lib/labels';
import type { RecommendationSeverity } from '@/types';

import { useOnboardingSteps } from '../useOnboardingSteps';
import styles from '../Onboarding.module.css';

const SEVERITY_CLASS: Record<RecommendationSeverity, string> = {
  critical: styles.recCritical ?? '',
  important: styles.recImportant ?? '',
  nice: styles.recNice ?? '',
};

const SEVERITY_TONE: Record<RecommendationSeverity, 'danger' | 'warning' | 'info'> = {
  critical: 'danger',
  important: 'warning',
  nice: 'info',
};

export const ResultsStep = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { t, tPlural } = useTranslation();
  const { goTo } = useOnboardingSteps();

  const onboarding = useAppSelector(selectOnboarding);
  const activeAnalysis = useAppSelector(selectActiveAnalysis);
  const onboardingAnalysis = useAppSelector((state) =>
    selectAnalysisForCv(state, onboarding.cvId),
  );
  const metrics = useAppSelector(selectDashboardMetrics);
  const metricsStatus = useAppSelector(selectMetricsStatus);

  const analysis = onboardingAnalysis ?? activeAnalysis;
  const [isFinishing, setIsFinishing] = useState(false);

  // Match count comes from the metrics endpoint rather than the analysis
  // fixture, so it is correct on the skip path too.
  useEffect(() => {
    void dispatch(fetchDashboardMetrics());
  }, [dispatch]);

  // A page loaded straight into this step has no analysis in the store yet;
  // the persisted CV id is enough to fetch it back.
  useEffect(() => {
    if (onboarding.cvId === null || onboardingAnalysis !== null) return;
    void dispatch(fetchCvAnalysis(onboarding.cvId));
  }, [dispatch, onboarding.cvId, onboardingAnalysis]);

  const onFinish = (): void => {
    setIsFinishing(true);
    void dispatch(completeOnboarding()).then(() => {
      // The onboarding guard redirects to the dashboard once the user is marked
      // complete; navigating explicitly keeps the transition immediate.
      window.location.assign('/dashboard');
    });
  };

  const skipped = analysis === null;
  const matchedJobs = metrics?.matchedJobsCount ?? 0;

  return (
    <section className={styles.card}>
      <h1 className={styles.stepTitle}>{t('onboarding.results.title')}</h1>
      <p className={styles.stepSubtitle}>{t('onboarding.results.subtitle')}</p>

      {skipped ? (
        <div className={styles.noCv}>
          <h2 className={styles.noCvTitle}>{t('onboarding.results.noCvTitle')}</h2>
          <p className={styles.noCvBody}>{t('onboarding.results.noCvBody')}</p>
          <Button variant="secondary" onClick={() => goTo('cv')}>
            {t('onboarding.results.uploadNow')}
          </Button>
        </div>
      ) : null}

      <div className={styles.resultGrid}>
        {analysis === null ? null : (
          <div className={styles.resultTile}>
            <MatchScore score={analysis.score} size={64} showLabel={false} />
            <span className={styles.resultTileBody}>
              <span className={styles.resultLabel}>{t('onboarding.results.cvScore')}</span>
              <span className={styles.resultValue}>{analysis.score}</span>
            </span>
          </div>
        )}

        <div className={styles.resultTile}>
          <span className={styles.resultTileBody}>
            <span className={styles.resultLabel}>{t('onboarding.results.matchedJobs')}</span>
            {metricsStatus === 'loading' ? (
              <Skeleton width="60px" height="28px" variant="block" />
            ) : (
              <span className={styles.resultValue}>{matchedJobs}</span>
            )}
          </span>
        </div>

        {analysis === null ? null : (
          <div className={styles.resultTile}>
            <span className={styles.resultTileBody}>
              <span className={styles.resultLabel}>{t('onboarding.results.experience')}</span>
              <span className={styles.resultValue}>
                {tPlural('onboarding.results.years', analysis.experienceYears)}
              </span>
            </span>
          </div>
        )}
      </div>

      {analysis === null ? null : (
        <>
          <div className={styles.resultSection}>
            <h2 className={styles.resultSectionTitle}>{t('onboarding.results.yourSkills')}</h2>
            <div className={styles.skillRow}>
              {analysis.detectedSkills.map((skill) => (
                <Badge key={skill.skillId} tone="success" icon="✓">
                  {skill.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className={styles.resultSection}>
            <h2 className={styles.resultSectionTitle}>{t('onboarding.results.missingSkills')}</h2>
            <p className={styles.resultSectionHint}>{t('onboarding.results.missingHint')}</p>

            <div className={styles.missingList}>
              {analysis.missingSkills.map((skill) => (
                <div key={skill.skillId} className={styles.missingItem}>
                  <div>
                    <p className={styles.missingName}>{skill.name}</p>
                    <p className={styles.missingMeta}>
                      {t('landing.cv.demand', { percent: skill.demandPercent })} ·{' '}
                      {tPlural('onboarding.results.weeksToLearn', skill.learnEstimateWeeks)}
                    </p>
                  </div>
                  <Badge
                    tone={
                      skill.priority === 'high'
                        ? 'danger'
                        : skill.priority === 'medium'
                          ? 'warning'
                          : 'neutral'
                    }
                  >
                    {t(PRIORITY_LABEL[skill.priority])}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.resultSection}>
            <h2 className={styles.resultSectionTitle}>{t('onboarding.results.recommendations')}</h2>

            <div className={styles.recommendations}>
              {analysis.recommendations.map((recommendation) => (
                <article
                  key={recommendation.id}
                  className={cx(styles.recommendation, SEVERITY_CLASS[recommendation.severity])}
                >
                  <div>
                    <div className={styles.recTitle}>
                      {recommendation.title}{' '}
                      <Badge tone={SEVERITY_TONE[recommendation.severity]}>
                        {t(SEVERITY_LABEL[recommendation.severity])}
                      </Badge>
                    </div>
                    <p className={styles.recBody}>{recommendation.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </>
      )}

      <div className={styles.actions}>
        <span />
        <Button size="lg" onClick={onFinish} isLoading={isFinishing}>
          {t('onboarding.results.cta')}
        </Button>
      </div>

      <p className="visuallyHidden">{onboarding.skippedCv ? t('onboarding.results.noCvTitle') : ''}</p>
    </section>
  );
};
