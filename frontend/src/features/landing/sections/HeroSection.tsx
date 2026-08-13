import { MatchScore } from '@/components/domain/MatchScore/MatchScore';
import { LinkButton } from '@/components/ui/Button/LinkButton';
import { useTranslation } from '@/i18n/useTranslation';
import { cx } from '@/lib/cx';

import styles from '../Landing.module.css';

/**
 * Illustrative figures for the marketing surface. These are copy, not data —
 * the landing page has no session and never calls the API.
 */
const SHOWCASE = {
  cvScore: 74,
  newMatches: 12,
  topGap: 'Next.js',
} as const;

export const HeroSection = (): React.JSX.Element => {
  const { t } = useTranslation();

  return (
    <section className={styles.hero}>
      <span className={styles.heroGlow} aria-hidden="true" />

      <div className={styles.heroCopy}>
        <span className={styles.heroBadge}>{t('landing.hero.badge')}</span>

        <h1 className={styles.heroTitle}>
          {t('landing.hero.title')}
          <span className={styles.heroAccent}>{t('landing.hero.titleAccent')}</span>
        </h1>

        <p className={styles.heroSubtitle}>{t('landing.hero.subtitle')}</p>

        <div className={styles.heroActions}>
          <LinkButton to="/signup" size="lg">
            {t('landing.hero.ctaPrimary')}
          </LinkButton>
          <LinkButton to="#how-it-works" size="lg" variant="secondary">
            {t('landing.hero.ctaSecondary')}
          </LinkButton>
        </div>

        <p className={styles.heroNote}>{t('landing.hero.note')}</p>
      </div>

      <div className={styles.heroVisual}>
        <div className={styles.floatCard}>
          <MatchScore score={SHOWCASE.cvScore} size={72} showLabel={false} />
          <span className={styles.floatCardBody}>
            <span className={styles.floatLabel}>{t('landing.hero.cardScore')}</span>
            <span className={styles.floatValue}>{SHOWCASE.cvScore}/100</span>
            <span className={styles.floatCaption}>{t('landing.hero.cardScoreCaption')}</span>
          </span>
        </div>

        <div className={cx(styles.floatCard, styles.floatCardOffsetStart)}>
          <span className={cx(styles.floatIcon, styles.iconSuccess)} aria-hidden="true">
            ↑
          </span>
          <span className={styles.floatCardBody}>
            <span className={styles.floatLabel}>{t('landing.hero.cardMatches')}</span>
            <span className={styles.floatValue}>{SHOWCASE.newMatches}</span>
          </span>
        </div>

        <div className={cx(styles.floatCard, styles.floatCardOffsetEnd)}>
          <span className={cx(styles.floatIcon, styles.iconWarning)} aria-hidden="true">
            !
          </span>
          <span className={styles.floatCardBody}>
            <span className={styles.floatLabel}>{t('landing.hero.cardGap')}</span>
            <span className={styles.floatValue}>{SHOWCASE.topGap}</span>
          </span>
        </div>
      </div>
    </section>
  );
};
