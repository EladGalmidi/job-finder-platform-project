import { Link } from 'react-router-dom';

import { SectionHeading } from '@/components/ui/SectionHeading/SectionHeading';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/types';
import { cx } from '@/lib/cx';

import styles from '../Landing.module.css';

const FEATURES: readonly { glyph: string; title: TranslationKey; body: TranslationKey }[] = [
  { glyph: '◆', title: 'landing.features.f1.title', body: 'landing.features.f1.body' },
  { glyph: '◭', title: 'landing.features.f2.title', body: 'landing.features.f2.body' },
  { glyph: '▣', title: 'landing.features.f3.title', body: 'landing.features.f3.body' },
  { glyph: '◧', title: 'landing.features.f4.title', body: 'landing.features.f4.body' },
  { glyph: '◉', title: 'landing.features.f5.title', body: 'landing.features.f5.body' },
  { glyph: '⇄', title: 'landing.features.f6.title', body: 'landing.features.f6.body' },
];

const QUOTES: readonly {
  initials: string;
  quote: TranslationKey;
  name: TranslationKey;
  role: TranslationKey;
}[] = [
  {
    initials: 'FE',
    quote: 'landing.proof.t1.quote',
    name: 'landing.proof.t1.name',
    role: 'landing.proof.t1.role',
  },
  {
    initials: 'BE',
    quote: 'landing.proof.t2.quote',
    name: 'landing.proof.t2.name',
    role: 'landing.proof.t2.role',
  },
  {
    initials: 'PM',
    quote: 'landing.proof.t3.quote',
    name: 'landing.proof.t3.name',
    role: 'landing.proof.t3.role',
  },
];

export const FeatureGrid = (): React.JSX.Element => {
  const { t } = useTranslation();

  return (
    <div className={styles.sectionAlt} id="features">
      <section className={styles.sectionAltInner} aria-labelledby="features-title">
        <SectionHeading
          centered
          id="features-title"
          eyebrow={t('landing.features.eyebrow')}
          title={t('landing.features.title')}
          subtitle={t('landing.features.subtitle')}
        />

        <div className={styles.featureGrid}>
          {FEATURES.map((feature) => (
            <article key={feature.title} className={styles.feature}>
              <span className={styles.featureIcon} aria-hidden="true">
                {feature.glyph}
              </span>
              <h3 className={styles.featureTitle}>{t(feature.title)}</h3>
              <p className={styles.featureBody}>{t(feature.body)}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

/**
 * Testimonials are explicitly labelled as illustrative. Presenting invented
 * quotes as real customer feedback would be a fabricated endorsement.
 */
export const SocialProof = (): React.JSX.Element => {
  const { t } = useTranslation();

  return (
    <section className={styles.section} aria-labelledby="proof-title">
      <SectionHeading
        centered
        id="proof-title"
        eyebrow={t('landing.proof.eyebrow')}
        title={t('landing.proof.title')}
      />

      <div className={styles.quotes}>
        {QUOTES.map((entry) => (
          <figure key={entry.name} className={styles.quote}>
            <span className={styles.quoteMark} aria-hidden="true">
              &ldquo;
            </span>
            <blockquote className={styles.quoteText}>{t(entry.quote)}</blockquote>
            <figcaption className={styles.quoteAuthor}>
              <span className={styles.quoteAvatar} aria-hidden="true">
                {entry.initials}
              </span>
              <span>
                <span className={styles.quoteName}>{t(entry.name)}</span>
                <br />
                <span className={styles.quoteRole}>{t(entry.role)}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      <p className={styles.disclaimer}>{t('landing.proof.disclaimer')}</p>
    </section>
  );
};

export const FinalCta = (): React.JSX.Element => {
  const { t } = useTranslation();

  return (
    <section className={cx(styles.section, styles.sectionTight)}>
      <div className={styles.finalCta}>
        <h2 className={styles.finalCtaTitle}>{t('landing.cta.title')}</h2>
        <p className={styles.finalCtaSubtitle}>{t('landing.cta.subtitle')}</p>

        <div className={styles.finalCtaActions}>
          <Link to="/signup" className={styles.ctaButton}>
            {t('landing.cta.button')}
          </Link>
          <Link to="/login" className={styles.ctaGhost}>
            {t('landing.cta.secondary')}
          </Link>
        </div>
      </div>
    </section>
  );
};
