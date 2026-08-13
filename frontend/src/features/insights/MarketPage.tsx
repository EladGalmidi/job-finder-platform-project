import { useEffect, useMemo, useState } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { QueryBoundary } from '@/components/feedback/QueryBoundary';
import { Skeleton } from '@/components/ui/Skeleton/Skeleton';
import { selectActiveAnalysis } from '@/features/cv/cvSlice';
import { selectRefreshToken } from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';
import { cx } from '@/lib/cx';
import { formatNumber, formatPercent, formatRelativeTime } from '@/lib/format';
import { MARKET_TREND_LABEL, ROLE_LABEL, SENIORITY_LABEL } from '@/lib/labels';
import { MARKET_ROLE_KEYS, SENIORITIES, type MarketTrend, type RoleKey } from '@/types';

import {
  fetchMarketSnapshot,
  selectMarketSnapshot,
  selectMarketStatus,
} from './insightsSlice';
import styles from './Market.module.css';

const TREND_CLASS: Record<MarketTrend, string> = {
  up: styles.trendUp ?? '',
  down: styles.trendDown ?? '',
  stable: styles.trendStable ?? '',
};

const TREND_GLYPH: Record<MarketTrend, string> = { up: '↑', down: '↓', stable: '→' };

export const MarketPage = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { t, tPlural, locale } = useTranslation();

  const [role, setRole] = useState<RoleKey>('frontend');
  const snapshot = useAppSelector((state) => selectMarketSnapshot(state, role));
  const status = useAppSelector(selectMarketStatus);
  const analysis = useAppSelector(selectActiveAnalysis);
  const refreshToken = useAppSelector(selectRefreshToken);

  useEffect(() => {
    void dispatch(fetchMarketSnapshot(role));
  }, [dispatch, role, refreshToken]);

  /** Skills the CV already shows, so demand rows can be marked. */
  const ownedSkillIds = useMemo(
    () => new Set((analysis?.detectedSkills ?? []).map((skill) => skill.skillId)),
    [analysis],
  );

  // One scale across all seniority bands so the bars are visually comparable.
  const salaryScale = useMemo(() => {
    if (snapshot === null) return { min: 0, max: 1 };
    const bands = SENIORITIES.map((level) => snapshot.salaryBySeniority[level]);
    return {
      min: Math.min(...bands.map((band) => band.min)),
      max: Math.max(...bands.map((band) => band.max)),
    };
  }, [snapshot]);

  const percentOf = (value: number): number =>
    ((value - salaryScale.min) / (salaryScale.max - salaryScale.min)) * 100;

  const shortIls = (value: number): string => `₪${String(Math.round(value / 1000))}k`;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>{t('market.title')}</h2>
          <p className={styles.subtitle}>{t('market.subtitle')}</p>
        </div>
        {snapshot === null ? null : (
          <span className={styles.updated}>
            {t('market.lastUpdated', { when: formatRelativeTime(locale, snapshot.updatedAt) })}
          </span>
        )}
      </header>

      <div className={styles.roles} role="group" aria-label={t('market.roleSelector')}>
        {MARKET_ROLE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={cx(styles.role, role === key && styles.roleActive)}
            aria-pressed={role === key}
            onClick={() => setRole(key)}
          >
            {role === key ? <span aria-hidden="true">✓</span> : null}
            {t(ROLE_LABEL[key])}
          </button>
        ))}
      </div>

      <QueryBoundary
        status={snapshot === null ? status : 'succeeded'}
        isEmpty={status === 'succeeded' && snapshot === null}
        onRetry={() => void dispatch(fetchMarketSnapshot(role))}
        skeleton={
          <div className={styles.page}>
            <Skeleton variant="block" height="110px" />
            <Skeleton variant="block" height="380px" />
          </div>
        }
        empty={
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>{t('market.emptyTitle')}</h3>
            <p className={styles.panelSubtitle}>{t('market.emptyBody')}</p>
          </div>
        }
      >
        {snapshot === null ? null : (
          <>
            <section className={styles.summary}>
              <div className={styles.tile}>
                <span className={styles.tileLabel}>{t('market.openRoles')}</span>
                <span className={styles.tileValue}>
                  {formatNumber(locale, snapshot.openPositions)}
                </span>
              </div>
              <div className={styles.tile}>
                <span className={styles.tileLabel}>{t('market.competition')}</span>
                <span className={styles.tileValue}>
                  {snapshot.competitionIndex.toFixed(1)}
                </span>
              </div>
              <div className={styles.tile}>
                <span className={styles.tileLabel}>{t('market.median')}</span>
                <span className={styles.tileValue}>
                  {shortIls(snapshot.salaryBySeniority.mid.median)}
                </span>
              </div>
            </section>

            <div className={styles.columns}>
              <div className={styles.column}>
                <section className={styles.panel} aria-labelledby="skills-title">
                  <h3 id="skills-title" className={styles.panelTitle}>
                    {t('market.topSkills')}
                  </h3>
                  <p className={styles.panelSubtitle}>{t('market.topSkillsSubtitle')}</p>

                  <div className={styles.skills}>
                    {snapshot.topSkills.slice(0, 10).map((skill, index) => {
                      const owned = ownedSkillIds.has(skill.skillId);

                      return (
                        <div key={skill.skillId} className={styles.skill}>
                          <div className={styles.skillHead}>
                            <span className={styles.skillName}>
                              <span className={styles.rank} aria-hidden="true">
                                {index + 1}
                              </span>
                              {skill.name}
                              {owned ? (
                                <span className={styles.haveTag}>
                                  <span aria-hidden="true">✓ </span>
                                  {t('market.youHave')}
                                </span>
                              ) : null}
                            </span>
                            <span className={styles.skillDemand}>
                              {formatPercent(locale, skill.demandPercent)}
                            </span>
                          </div>

                          <div className={styles.barRow}>
                            {/* The percentage is stated beside the label, so the
                                bar is decorative. */}
                            <div className={styles.bar} aria-hidden="true">
                              <div
                                className={styles.barFill}
                                style={{ inlineSize: `${String(skill.demandPercent)}%` }}
                              />
                            </div>
                          </div>

                          <div className={styles.skillMeta}>
                            <span className={TREND_CLASS[skill.trend]}>
                              <span aria-hidden="true">{TREND_GLYPH[skill.trend]} </span>
                              {t(MARKET_TREND_LABEL[skill.trend])}
                              {skill.trendDelta === 0
                                ? ''
                                : ` · ${t('market.trendDelta', {
                                    delta: skill.trendDelta > 0 ? `+${String(skill.trendDelta)}` : String(skill.trendDelta),
                                  })}`}
                            </span>
                            <span>{t('market.salaryImpact', { percent: skill.avgSalaryImpactPercent })}</span>
                            <span>{tPlural('market.openPositions', skill.openPositions)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              <div className={styles.column}>
                <section className={styles.panel} aria-labelledby="salary-title">
                  <h3 id="salary-title" className={styles.panelTitle}>
                    {t('market.salaryTitle')}
                  </h3>
                  <p className={styles.panelSubtitle}>{t('market.salarySubtitle')}</p>

                  <div className={styles.salaries}>
                    {SENIORITIES.map((level) => {
                      const band = snapshot.salaryBySeniority[level];

                      return (
                        <div key={level} className={styles.salaryRow}>
                          <div className={styles.salaryHead}>
                            <span className={styles.salaryLevel}>{t(SENIORITY_LABEL[level])}</span>
                            <span className={styles.salaryMedian}>
                              {t('market.median')} {shortIls(band.median)}
                            </span>
                          </div>

                          {/* Range and median are both stated in text below, so
                              the track itself carries no unique information. */}
                          <div className={styles.salaryTrack} aria-hidden="true">
                            <span
                              className={styles.salaryBand}
                              style={{
                                insetInlineStart: `${String(percentOf(band.min))}%`,
                                inlineSize: `${String(percentOf(band.max) - percentOf(band.min))}%`,
                              }}
                            />
                            <span
                              className={styles.salaryMarker}
                              style={{ insetInlineStart: `${String(percentOf(band.median))}%` }}
                            />
                          </div>

                          <div className={styles.salaryScale}>
                            <span>{shortIls(band.min)}</span>
                            <span>{shortIls(band.max)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className={styles.panel} aria-labelledby="sources-title">
                  <h3 id="sources-title" className={styles.panelTitle}>
                    {t('market.sourcesTitle')}
                  </h3>
                  <p className={styles.panelSubtitle}>
                    {t('market.lastUpdated', {
                      when: formatRelativeTime(locale, snapshot.updatedAt),
                    })}
                  </p>

                  <div className={styles.sources}>
                    {snapshot.sources.map((source) => (
                      <div key={source.name} className={styles.source}>
                        <span className={styles.sourceName}>{source.name}</span>
                        <span className={styles.sourceMeta}>
                          {tPlural('market.sourceSample', source.sampleSize)} ·{' '}
                          {t('market.collected', {
                            when: formatRelativeTime(locale, source.collectedAt),
                          })}
                        </span>
                      </div>
                    ))}
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
