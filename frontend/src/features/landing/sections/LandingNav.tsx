import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/Button/Button';
import { localeSet, selectLocale, selectTheme, themeToggled } from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';
import { cx } from '@/lib/cx';

import styles from '../Landing.module.css';

export const LandingNav = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const locale = useAppSelector(selectLocale);
  const theme = useAppSelector(selectTheme);
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);

  // The nav border only appears once the page has moved, so the header reads as
  // part of the hero at rest.
  useEffect(() => {
    const onScroll = (): void => {
      setScrolled(window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <header className={cx(styles.nav, scrolled && styles.navScrolled)}>
      <div className={styles.navInner}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            JM
          </span>
          {t('app.name')}
        </Link>

        <nav className={styles.navLinks} aria-label={t('landing.nav.features')}>
          <a className={styles.navLink} href="#how-it-works">
            {t('landing.nav.howItWorks')}
          </a>
          <a className={styles.navLink} href="#insights">
            {t('landing.nav.insights')}
          </a>
          <a className={styles.navLink} href="#features">
            {t('landing.nav.features')}
          </a>
        </nav>

        <div className={styles.navActions}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => dispatch(localeSet(locale === 'en' ? 'he' : 'en'))}
            aria-label={t('locale.switch')}
          >
            {locale === 'en' ? 'עב' : 'EN'}
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => dispatch(themeToggled())}
            aria-label={t('theme.toggle')}
            aria-pressed={theme === 'dark'}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☾' : '☀'}</span>
          </button>

          <Link to="/login">
            <Button variant="ghost" size="sm">
              {t('landing.nav.login')}
            </Button>
          </Link>
          <Link to="/signup">
            <Button size="sm">{t('landing.nav.signup')}</Button>
          </Link>
        </div>
      </div>
    </header>
  );
};
