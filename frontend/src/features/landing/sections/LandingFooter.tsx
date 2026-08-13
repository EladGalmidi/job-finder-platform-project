import { Link } from 'react-router-dom';

import { useTranslation } from '@/i18n/useTranslation';

import styles from '../Landing.module.css';

export const LandingFooter = (): React.JSX.Element => {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrandBlock}>
          <Link to="/" className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              JM
            </span>
            {t('app.name')}
          </Link>
          <p className={styles.footerNote}>{t('app.tagline')}</p>
          <p className={styles.footerNote}>{t('landing.footer.demoNote')}</p>
        </div>

        <nav className={styles.footerColumn} aria-label={t('landing.footer.product')}>
          <h2 className={styles.footerHeading}>{t('landing.footer.product')}</h2>
          <a className={styles.footerLink} href="#how-it-works">
            {t('landing.nav.howItWorks')}
          </a>
          <a className={styles.footerLink} href="#features">
            {t('landing.nav.features')}
          </a>
          <a className={styles.footerLink} href="#insights">
            {t('landing.nav.insights')}
          </a>
        </nav>

        <nav className={styles.footerColumn} aria-label={t('landing.footer.company')}>
          <h2 className={styles.footerHeading}>{t('landing.footer.company')}</h2>
          <Link className={styles.footerLink} to="/signup">
            {t('landing.footer.about')}
          </Link>
          <Link className={styles.footerLink} to="/signup">
            {t('landing.footer.careers')}
          </Link>
          <Link className={styles.footerLink} to="/signup">
            {t('landing.footer.contact')}
          </Link>
        </nav>

        <nav className={styles.footerColumn} aria-label={t('landing.footer.legal')}>
          <h2 className={styles.footerHeading}>{t('landing.footer.legal')}</h2>
          <Link className={styles.footerLink} to="/signup">
            {t('landing.footer.privacy')}
          </Link>
          <Link className={styles.footerLink} to="/signup">
            {t('landing.footer.terms')}
          </Link>
        </nav>
      </div>

      <div className={styles.footerBar}>
        © {year} {t('app.name')}. {t('landing.footer.rights')}
      </div>
    </footer>
  );
};
