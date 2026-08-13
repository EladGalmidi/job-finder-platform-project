import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { AlertCard } from '@/components/domain/AlertCard/AlertCard';
import { JobCard } from '@/components/domain/JobCard/JobCard';
import { MatchScore } from '@/components/domain/MatchScore/MatchScore';
import { SkillTag } from '@/components/domain/SkillTag/SkillTag';
import { QueryBoundary } from '@/components/feedback/QueryBoundary';
import { LinkButton } from '@/components/ui/Button/LinkButton';
import { EmptyState } from '@/components/ui/EmptyState/EmptyState';
import { MetricCard } from '@/components/ui/MetricCard/MetricCard';
import { Skeleton } from '@/components/ui/Skeleton/Skeleton';
import {
  selectApplicationByJobId,
  selectIsJobMutating,
} from '@/features/applications/applicationsSlice';
import { selectCurrentUser } from '@/features/auth/authSlice';
import { fetchActiveCv, fetchCvAnalysis, selectActiveAnalysis, selectActiveCv } from '@/features/cv/cvSlice';
import {
  dismissAlert,
  fetchActivity,
  fetchDashboardMetrics,
  selectActivity,
  selectAlerts,
  selectDashboardMetrics,
  selectMetricsStatus,
} from '@/features/insights/insightsSlice';
import {
  fetchJobs,
  jobsQueryKey,
  selectJobById,
  selectJobList,
  selectMatchByJobId,
} from '@/features/jobs/jobsSlice';
import { jobDetailPath, useJobActions } from '@/features/jobs/useJobActions';
import { selectRefreshToken, toastPushed } from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';
import { cx } from '@/lib/cx';
import { formatRelativeTime } from '@/lib/format';
import { CV_SECTION_LABEL } from '@/lib/labels';
import { scoreBand, scoreBandCssVar } from '@/lib/scoring';
import type { AlertId, JobId, JobQuery } from '@/types';

import styles from './Dashboard.module.css';

/** Top matches shown on the dashboard. */
const TOP_MATCHES_QUERY: JobQuery = {
  q: '',
  roles: [],
  locations: [],
  remoteModes: [],
  jobTypes: [],
  seniorities: [],
  salaryMin: null,
  sort: 'relevance',
  tab: 'all',
  page: 1,
};

const greetingKey = (): 'dashboard.greetingMorning' | 'dashboard.greetingAfternoon' | 'dashboard.greetingEvening' => {
  const hour = new Date().getHours();
  if (hour < 12) return 'dashboard.greetingMorning';
  if (hour < 18) return 'dashboard.greetingAfternoon';
  return 'dashboard.greetingEvening';
};

export const DashboardPage = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { t, tPlural, locale } = useTranslation();
  const actions = useJobActions();

  const user = useAppSelector(selectCurrentUser);
  const metrics = useAppSelector(selectDashboardMetrics);
  const metricsStatus = useAppSelector(selectMetricsStatus);
  const alerts = useAppSelector(selectAlerts);
  const activity = useAppSelector(selectActivity);
  const activeCv = useAppSelector(selectActiveCv);
  const analysis = useAppSelector(selectActiveAnalysis);
  const refreshToken = useAppSelector(selectRefreshToken);

  const listKey = jobsQueryKey(TOP_MATCHES_QUERY);
  const list = useAppSelector((state) => selectJobList(state, listKey));

  const [dismissingId, setDismissingId] = useState<string | null>(null);

  useEffect(() => {
    void dispatch(fetchDashboardMetrics());
    void dispatch(fetchActivity(8));
    void dispatch(fetchJobs(TOP_MATCHES_QUERY));
    void dispatch(fetchActiveCv());
  }, [dispatch, refreshToken]);

  // The analysis is a second hop: it needs the active CV id first.
  useEffect(() => {
    if (activeCv === null || analysis !== null) return;
    void dispatch(fetchCvAnalysis(activeCv.id));
  }, [dispatch, activeCv, analysis]);

  const topJobs = (list?.ids ?? []).slice(0, 5);
  const firstName = (user?.fullName ?? '').split(' ')[0] ?? '';
  const hasCv = analysis !== null;

  const subtitle = !hasCv
    ? t('dashboard.subtitleNoCv')
    : (metrics?.matchedJobsCount ?? 0) > 0
      ? t('dashboard.subtitleWithMatches', { count: metrics?.matchedJobsCount ?? 0 })
      : t('dashboard.subtitleNoMatches');

  const onDismissAlert = (id: AlertId): void => {
    setDismissingId(id);
    void dispatch(dismissAlert(id)).then(() => {
      setDismissingId(null);
      dispatch(
        toastPushed({ severity: 'info', title: t('dashboard.alertDismissed'), durationMs: 2500 }),
      );
    });
  };

  const topRecommendation = analysis?.recommendations[0] ?? null;

  return (
    <div className={styles.page}>
      <section className={styles.welcome}>
        <div>
          <h2 className={styles.welcomeTitle}>{t(greetingKey(), { name: firstName })}</h2>
          <p className={styles.welcomeSubtitle}>{subtitle}</p>
        </div>

        <div className={styles.welcomeActions}>
          <LinkButton to="/dashboard/jobs">{t('dashboard.ctaBrowseJobs')}</LinkButton>
          {hasCv ? (
            <LinkButton to="/dashboard/cv" variant="secondary">
              {t('dashboard.ctaViewCv')}
            </LinkButton>
          ) : (
            <LinkButton to="/onboarding/cv" variant="secondary">
              {t('dashboard.ctaUploadCv')}
            </LinkButton>
          )}
        </div>
      </section>

      <section className={styles.metrics} aria-label={t('dashboard.metricsLabel')}>
        <MetricCard
          label={t('dashboard.metricCvScore')}
          value={metrics?.cvScore ?? null}
          placeholder={t('dashboard.metricNoCv')}
          glyph="▤"
          tone="primary"
          isLoading={metricsStatus === 'loading'}
          to="/dashboard/cv"
        />
        <MetricCard
          label={t('dashboard.metricMatchedJobs')}
          value={metrics?.matchedJobsCount ?? 0}
          hint={t('dashboard.metricNewThisWeek', { count: metrics?.newMatchesThisWeek ?? 0 })}
          glyph="◆"
          tone="success"
          isLoading={metricsStatus === 'loading'}
          to="/dashboard/jobs"
        />
        <MetricCard
          label={t('dashboard.metricMissingSkills')}
          value={metrics?.missingSkillsCount ?? 0}
          hint={t('dashboard.metricAcrossMatches')}
          glyph="◭"
          tone="warning"
          isLoading={metricsStatus === 'loading'}
          to="/dashboard/cv"
        />
        <MetricCard
          label={t('dashboard.metricApplicationsSent')}
          value={metrics?.applicationsSent ?? 0}
          hint={t('dashboard.metricInterviews', { count: metrics?.interviewsScheduled ?? 0 })}
          glyph="▣"
          tone="info"
          isLoading={metricsStatus === 'loading'}
          to="/dashboard/applications"
        />
      </section>

      <div className={styles.columns}>
        <div className={styles.column}>
          <section className={styles.panel} aria-labelledby="matches-title">
            <div className={styles.panelHead}>
              <div>
                <h2 id="matches-title" className={styles.panelTitle}>
                  {t('dashboard.matchesTitle')}
                </h2>
                <p className={styles.panelSubtitle}>{t('dashboard.matchesSubtitle')}</p>
              </div>
              <Link to="/dashboard/jobs" className={styles.panelLink}>
                {t('dashboard.matchesViewAll')}
              </Link>
            </div>

            <QueryBoundary
              status={list?.status ?? 'loading'}
              error={list?.error ?? null}
              isEmpty={topJobs.length === 0}
              onRetry={() => void dispatch(fetchJobs(TOP_MATCHES_QUERY))}
              skeleton={
                <div className={styles.stack}>
                  <Skeleton variant="block" height="150px" />
                  <Skeleton variant="block" height="150px" />
                  <Skeleton variant="block" height="150px" />
                </div>
              }
              empty={
                <EmptyState
                  icon="◆"
                  title={t('dashboard.matchesEmptyTitle')}
                  body={t('dashboard.matchesEmptyBody')}
                  action={
                    <LinkButton to="/dashboard/jobs" variant="secondary">
                      {t('dashboard.ctaBrowseJobs')}
                    </LinkButton>
                  }
                />
              }
            >
              <div className={styles.stack}>
                {topJobs.map((jobId) => (
                  <DashboardJobCard key={jobId} jobId={jobId} actions={actions} />
                ))}
              </div>
            </QueryBoundary>
          </section>

          <section className={styles.panel} aria-labelledby="activity-title">
            <div className={styles.panelHead}>
              <h2 id="activity-title" className={styles.panelTitle}>
                {t('dashboard.activityTitle')}
              </h2>
            </div>

            {activity.length === 0 ? (
              <EmptyState
                icon="◷"
                title={t('dashboard.activityEmptyTitle')}
                body={t('dashboard.activityEmptyBody')}
              />
            ) : (
              <ul className={styles.stackTight}>
                {activity.map((entry) => (
                  <li key={entry.id} className={styles.activityItem}>
                    <span className={styles.activityDot} aria-hidden="true">
                      ●
                    </span>
                    <span className={styles.activityBody}>
                      <span className={styles.activityText}>{entry.text}</span>
                      <span className={styles.activityTime}>
                        {formatRelativeTime(locale, entry.at)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className={styles.column}>
          <section className={styles.panel} aria-labelledby="cv-title">
            <div className={styles.panelHead}>
              <h2 id="cv-title" className={styles.panelTitle}>
                {t('dashboard.cvTitle')}
              </h2>
              {analysis === null ? null : (
                <Link to="/dashboard/cv" className={styles.panelLink}>
                  {t('dashboard.cvViewFull')}
                </Link>
              )}
            </div>

            {analysis === null ? (
              <EmptyState
                icon="▤"
                title={t('dashboard.cvEmptyTitle')}
                body={t('dashboard.cvEmptyBody')}
                action={
                  <LinkButton to="/onboarding/cv" variant="secondary">
                    {t('dashboard.ctaUploadCv')}
                  </LinkButton>
                }
              />
            ) : (
              <>
                <div className={styles.cvHead}>
                  <MatchScore score={analysis.score} size={76} showLabel={false} />
                  <span className={styles.cvHeadMeta}>
                    <span className={styles.cvScoreLabel}>{t('dashboard.metricCvScore')}</span>
                    <span className={styles.cvScoreValue}>{analysis.score} / 100</span>
                  </span>
                </div>

                <div className={styles.breakdown}>
                  {analysis.breakdown.slice(0, 4).map((section) => (
                    <div key={section.key} className={styles.breakdownRow}>
                      <div className={styles.breakdownMeta}>
                        <span>{t(CV_SECTION_LABEL[section.key])}</span>
                        <span className={styles.breakdownScore}>{section.score}</span>
                      </div>
                      {/* The number beside the label carries the value; the bar
                          is decorative reinforcement. */}
                      <div className={styles.meter} aria-hidden="true">
                        <div
                          className={styles.meterFill}
                          style={{
                            inlineSize: `${String(section.score)}%`,
                            backgroundColor: scoreBandCssVar(scoreBand(section.score)),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.missingRow}>
                  <span className={styles.missingLabel}>{t('jobs.missingSkills')}</span>
                  {analysis.missingSkills.slice(0, 4).map((skill) => (
                    <SkillTag key={skill.skillId} name={skill.name} variant="missing" />
                  ))}
                </div>

                {topRecommendation === null ? null : (
                  <div className={styles.recommendation}>
                    <span className={styles.recommendationIcon} aria-hidden="true">
                      ★
                    </span>
                    <div>
                      <p className={styles.recommendationLabel}>{t('dashboard.cvRecommendation')}</p>
                      <p className={styles.recommendationTitle}>{topRecommendation.title}</p>
                      <p className={styles.recommendationBody}>{topRecommendation.body}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          <section className={styles.panel} aria-labelledby="alerts-title">
            <div className={styles.panelHead}>
              <h2 id="alerts-title" className={styles.panelTitle}>
                {t('dashboard.alertsTitle')}
              </h2>
              <span className={styles.panelSubtitle}>
                {tPlural('topbar.unread', alerts.filter((alert) => !alert.isRead).length)}
              </span>
            </div>

            {alerts.length === 0 ? (
              <EmptyState
                icon="✓"
                title={t('dashboard.alertsEmptyTitle')}
                body={t('dashboard.alertsEmptyBody')}
              />
            ) : (
              <div className={cx(styles.stackTight)}>
                {alerts.slice(0, 3).map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    isDismissing={dismissingId === alert.id}
                    onDismiss={() => onDismissAlert(alert.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

/**
 * Connects one card to the store.
 *
 * Kept separate so each card subscribes only to its own job and application
 * state; selecting all of it in the parent would re-render the whole list on
 * every save.
 */
const DashboardJobCard = ({
  jobId,
  actions,
}: {
  jobId: JobId;
  actions: ReturnType<typeof useJobActions>;
}): React.JSX.Element | null => {
  const job = useAppSelector((state) => selectJobById(state, jobId));
  const match = useAppSelector((state) => selectMatchByJobId(state, jobId));
  const application = useAppSelector((state) => selectApplicationByJobId(state, jobId));
  const isMutating = useAppSelector((state) => selectIsJobMutating(state, jobId));

  if (job === null) return null;

  return (
    <JobCard
      job={job}
      match={match}
      status={application?.status ?? null}
      isMutating={isMutating}
      detailPath={jobDetailPath(job.id)}
      onSave={() => actions.save(job)}
      onApply={() => actions.apply(job)}
      onShare={() => actions.share(job)}
      compact
    />
  );
};
