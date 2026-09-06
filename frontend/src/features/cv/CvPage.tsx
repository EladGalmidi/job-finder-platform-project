import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { SkillTag } from '@/components/domain/SkillTag/SkillTag';
import { QueryBoundary } from '@/components/feedback/QueryBoundary';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { LinkButton } from '@/components/ui/Button/LinkButton';
import { EmptyState } from '@/components/ui/EmptyState/EmptyState';
import { ProgressRing } from '@/components/ui/ProgressRing/ProgressRing';
import { Skeleton } from '@/components/ui/Skeleton/Skeleton';
import {
  fetchActiveCv,
  fetchCvAnalysis,
  fetchCvScore,
  importCvFromLinkedin,
  selectActiveAnalysis,
  selectActiveCv,
  selectActiveScore,
} from '@/features/cv/cvSlice';
import { selectRefreshToken, toastPushed } from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';
import { cx } from '@/lib/cx';
import { formatFileSize, formatPercent, formatRelativeTime } from '@/lib/format';
import { CV_SECTION_LABEL, PRIORITY_LABEL, SENIORITY_LABEL, SEVERITY_LABEL } from '@/lib/labels';
import { scoreBand, scoreBandCssVar } from '@/lib/scoring';
import { useCountUp } from '@/lib/useCountUp';
import type { MatchBand, RecommendationSeverity, RequestStatus } from '@/types';

import { useCvReport } from './useCvReport';
import styles from './Cv.module.css';

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

const BAND_TONE: Record<MatchBand, 'success' | 'warning' | 'danger'> = {
  high: 'success',
  medium: 'warning',
  low: 'danger',
};

const BAND_GLYPH: Record<MatchBand, string> = {
  high: '●●●',
  medium: '●●○',
  low: '●○○',
};

const BAND_LABEL = {
  high: 'match.high',
  medium: 'match.medium',
  low: 'match.low',
} as const;

export const CvPage = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t, tPlural, locale } = useTranslation();

  const cv = useAppSelector(selectActiveCv);
  const analysis = useAppSelector(selectActiveAnalysis);
  const backendScore = useAppSelector(selectActiveScore);
  const refreshToken = useAppSelector(selectRefreshToken);

  const [status, setStatus] = useState<RequestStatus>('loading');
  const [isImporting, setIsImporting] = useState(false);

  const report = useCvReport(cv, analysis);

  useEffect(() => {
    setStatus('loading');
    void dispatch(fetchActiveCv()).then((result) => {
      setStatus(fetchActiveCv.fulfilled.match(result) ? 'succeeded' : 'failed');
    });
  }, [dispatch, refreshToken]);

  // The analysis needs the CV id first, so it is a second hop.
  useEffect(() => {
    if (cv === null || analysis !== null) return;
    void dispatch(fetchCvAnalysis(cv.id));
  }, [dispatch, cv, analysis]);

  // So does the score. A rejection needs no handling: the ring falls back.
  useEffect(() => {
    if (cv === null) return;
    void dispatch(fetchCvScore(cv.id));
  }, [dispatch, cv]);

  const onLinkedinImport = (): void => {
    setIsImporting(true);
    void dispatch(importCvFromLinkedin()).then((result) => {
      setIsImporting(false);
      if (importCvFromLinkedin.fulfilled.match(result)) {
        navigate('/onboarding/analyzing');
        return;
      }
      dispatch(toastPushed({ severity: 'danger', title: t('state.errorTitle') }));
    });
  };

  /*
   * The number the ring shows.
   *
   * The scoring service is the source of truth. The locally computed analysis
   * score stands in only while that service has not answered for this CV — so
   * the ring keeps a real number rather than blanking or dropping to zero.
   */
  const heroScore = backendScore ?? analysis?.score ?? 0;
  const animatedScore = useCountUp(heroScore);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>{t('cv.title')}</h2>
          <p className={styles.subtitle}>{t('cv.subtitle')}</p>
        </div>

        <div className={styles.actions}>
          <LinkButton to="/dashboard/cv/upload" variant="secondary" size="sm">
            {t('cv.uploadNew')}
          </LinkButton>
          <Button variant="secondary" size="sm" onClick={onLinkedinImport} isLoading={isImporting}>
            {t('cv.importLinkedin')}
          </Button>
          <Button variant="secondary" size="sm" onClick={report.download} disabled={analysis === null}>
            {t('cv.downloadReport')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void report.exportJson()}
            disabled={cv === null}
          >
            {t('cv.exportJson')}
          </Button>
          <Button variant="ghost" size="sm" onClick={report.share} disabled={analysis === null}>
            {t('cv.shareLink')}
          </Button>
        </div>
      </header>

      <QueryBoundary
        status={cv !== null && analysis !== null ? 'succeeded' : status}
        isEmpty={status === 'succeeded' && cv === null}
        onRetry={() => void dispatch(fetchActiveCv())}
        skeleton={
          <div className={styles.page}>
            <Skeleton variant="block" height="150px" />
            <Skeleton variant="block" height="320px" />
          </div>
        }
        empty={
          <EmptyState
            icon="▤"
            title={t('cv.emptyTitle')}
            body={t('cv.emptyBody')}
            action={
              <LinkButton to="/dashboard/cv/upload">{t('cv.uploadNew')}</LinkButton>
            }
          />
        }
      >
        {analysis === null ? (
          <Skeleton variant="block" height="320px" />
        ) : (
          <>
            <section className={styles.hero}>
              <div className={styles.heroScore}>
                <ProgressRing
                  value={heroScore}
                  size={132}
                  thickness={12}
                  color={scoreBandCssVar(scoreBand(heroScore))}
                  label={t('cv.overallScore')}
                >
                  <span className={styles.heroValue}>{animatedScore}</span>
                </ProgressRing>

                <div className={styles.heroNumbers}>
                  <span className={styles.heroMetaLabel}>{t('cv.overallScore')}</span>
                  <span className={styles.heroOutOf}>{t('cv.outOf')}</span>
                  {/* Band as text and colour, never colour alone. */}
                  <Badge tone={BAND_TONE[scoreBand(heroScore)]} icon={BAND_GLYPH[scoreBand(heroScore)]}>
                    {t(BAND_LABEL[scoreBand(heroScore)])}
                  </Badge>
                </div>
              </div>

              <div className={styles.heroMeta}>
                {/* Shown only once the scoring service has answered. Omitting
                    the row is the graceful case: a placeholder number here
                    would be indistinguishable from a real score. */}
                {backendScore === null ? null : (
                  <div className={styles.heroMetaRow}>
                    <span className={styles.heroMetaLabel}>{t('cv.matchScore')}</span>
                    <span className={styles.heroMetaValue}>
                      {formatPercent(locale, backendScore)}
                    </span>
                  </div>
                )}
                <div className={styles.heroMetaRow}>
                  <span className={styles.heroMetaLabel}>{t('cv.experienceYears')}</span>
                  <span className={styles.heroMetaValue}>
                    {tPlural('onboarding.results.years', analysis.experienceYears)}
                  </span>
                </div>
                <div className={styles.heroMetaRow}>
                  <span className={styles.heroMetaLabel}>{t('cv.seniorityEstimate')}</span>
                  <span className={styles.heroMetaValue}>
                    {t(SENIORITY_LABEL[analysis.seniorityEstimate])}
                  </span>
                </div>
                {cv === null ? null : (
                  <div className={styles.heroMetaRow}>
                    <span className={styles.heroMetaLabel}>
                      {t('cv.analysedAt', { when: formatRelativeTime(locale, analysis.analyzedAt) })}
                    </span>
                    <span className={styles.heroMetaValue}>
                      {t('cv.fileMeta', {
                        name: cv.fileName,
                        size: formatFileSize(locale, cv.fileSizeBytes),
                      })}
                    </span>
                  </div>
                )}
              </div>
            </section>

            <div className={styles.columns}>
              <div className={styles.column}>
                <section className={styles.panel} aria-labelledby="breakdown-title">
                  <h3 id="breakdown-title" className={styles.panelTitle}>
                    {t('cv.breakdownTitle')}
                  </h3>
                  <p className={styles.panelSubtitle}>{t('cv.breakdownSubtitle')}</p>

                  <div className={styles.sections}>
                    {analysis.breakdown.map((section) => (
                      <div key={section.key} className={styles.section}>
                        <div className={styles.sectionHead}>
                          <span className={styles.sectionName}>
                            {t(CV_SECTION_LABEL[section.key])}{' '}
                            <span className={styles.sectionWeight}>
                              {t('cv.weight', { percent: Math.round(section.weight * 100) })}
                            </span>
                          </span>
                          <span className={styles.sectionScore}>{section.score}</span>
                        </div>

                        {/* The score sits beside the label, so the bar is
                            decorative reinforcement rather than the only signal. */}
                        <div className={styles.meter} aria-hidden="true">
                          <div
                            className={styles.meterFill}
                            style={{
                              inlineSize: `${String(section.score)}%`,
                              backgroundColor: scoreBandCssVar(scoreBand(section.score)),
                            }}
                          />
                        </div>

                        <p className={styles.sectionSummary}>{section.summary}</p>

                        {section.tips.length === 0 ? null : (
                          <ul className={styles.tips}>
                            {section.tips.map((tip) => (
                              <li key={tip} className={styles.tip}>
                                <span className={styles.tipMark} aria-hidden="true">
                                  →
                                </span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section className={styles.panel} aria-labelledby="missing-title">
                  <h3 id="missing-title" className={styles.panelTitle}>
                    {t('cv.missingTitle')}
                  </h3>
                  <p className={styles.panelSubtitle}>{t('cv.missingSubtitle')}</p>

                  <div className={styles.missingList}>
                    {analysis.missingSkills.map((skill) => (
                      <div key={skill.skillId} className={styles.missingItem}>
                        <div className={styles.missingHead}>
                          <span className={styles.missingName}>{skill.name}</span>
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

                        <div className={styles.missingDemandRow}>
                          <div className={styles.meter} aria-hidden="true" style={{ flex: 1 }}>
                            <div
                              className={styles.meterFill}
                              style={{
                                inlineSize: `${String(skill.demandPercent)}%`,
                                backgroundColor: 'var(--color-primary)',
                              }}
                            />
                          </div>
                          <span className={styles.missingDemandValue}>
                            {formatPercent(locale, skill.demandPercent)}
                          </span>
                        </div>

                        <p className={styles.missingMeta}>
                          {t('cv.demandLabel')} ·{' '}
                          {tPlural('cv.appearsIn', skill.appearsInJobs)} ·{' '}
                          {t('cv.learnTime', { count: skill.learnEstimateWeeks })}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className={styles.column}>
                <section className={styles.panel} aria-labelledby="recs-title">
                  <h3 id="recs-title" className={styles.panelTitle}>
                    {t('cv.recommendationsTitle')}
                  </h3>
                  <p className={styles.panelSubtitle}>{t('cv.recommendationsSubtitle')}</p>

                  <div className={styles.recommendations}>
                    {analysis.recommendations.map((rec) => (
                      <article
                        key={rec.id}
                        className={cx(styles.recommendation, SEVERITY_CLASS[rec.severity])}
                      >
                        <div className={styles.recHead}>
                          <span className={styles.recTitle}>{rec.title}</span>
                          <Badge tone={SEVERITY_TONE[rec.severity]}>
                            {t(SEVERITY_LABEL[rec.severity])}
                          </Badge>
                        </div>
                        <p className={styles.recBody}>{rec.body}</p>
                        {rec.actionRoute === undefined || rec.actionLabel === undefined ? null : (
                          <div className={styles.recAction}>
                            <LinkButton to={rec.actionRoute} size="sm" variant="secondary">
                              {rec.actionLabel}
                            </LinkButton>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </section>

                <section className={styles.panel} aria-labelledby="detected-title">
                  <h3 id="detected-title" className={styles.panelTitle}>
                    {t('cv.detectedTitle')}
                  </h3>
                  <p className={styles.panelSubtitle}>
                    {tPlural('skills.count', analysis.detectedSkills.length)}
                  </p>

                  <div className={styles.chipRow}>
                    {analysis.detectedSkills.map((skill) => (
                      <SkillTag key={skill.skillId} name={skill.name} variant="have" />
                    ))}
                  </div>

                  <div className={styles.keywordGroup}>
                    <p className={styles.keywordLabel}>{t('cv.keywordsFound')}</p>
                    <div className={styles.chipRow}>
                      {analysis.keywords.found.map((keyword) => (
                        <SkillTag key={keyword} name={keyword} />
                      ))}
                    </div>
                  </div>

                  <div className={styles.keywordGroup}>
                    <p className={styles.keywordLabel}>{t('cv.keywordsMissing')}</p>
                    {/* Without this, a term can appear under "skills we found"
                        and here at once, which reads as a contradiction rather
                        than the detected-vs-literal distinction it is. */}
                    <p className={styles.keywordHint}>{t('cv.keywordsHint')}</p>
                    <div className={styles.chipRow}>
                      {analysis.keywords.missing.map((keyword) => (
                        <SkillTag key={keyword} name={keyword} variant="missing" />
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </>
        )}
      </QueryBoundary>
    </div>
  );
};
