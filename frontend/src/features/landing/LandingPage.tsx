import { useTranslation } from '@/i18n/useTranslation';

import { HeroSection } from './sections/HeroSection';
import { LandingFooter } from './sections/LandingFooter';
import { LandingNav } from './sections/LandingNav';
import { FeatureGrid, FinalCta, SocialProof } from './sections/ProofSections';
import { CvPreview, HowItWorks, MatchPreview, StatsBar } from './sections/ShowcaseSections';

import styles from './Landing.module.css';

/**
 * The landing page owns its own chrome rather than sitting inside PublicLayout,
 * because its sections need to run full-bleed while the auth pages want a
 * centred, constrained column.
 *
 * Narrative order: promise (hero) → credibility (stats) → mechanism (how it
 * works) → proof of the two core features → social proof → ask.
 */
export const LandingPage = (): React.JSX.Element => {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <a className="skipLink" href="#main">
        {t('nav.skipToContent')}
      </a>

      <LandingNav />

      <main id="main">
        <HeroSection />
        <StatsBar />
        <HowItWorks />
        <CvPreview />
        <MatchPreview />
        <FeatureGrid />
        <SocialProof />
        <FinalCta />
      </main>

      <LandingFooter />
    </div>
  );
};
