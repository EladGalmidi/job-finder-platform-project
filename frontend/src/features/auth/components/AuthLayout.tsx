import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { localeSet, selectLocale, selectTheme, themeToggled } from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';

import styles from '../Auth.module.css';

export interface AuthLayoutProps {
  readonly title: string;
  readonly subtitle: string;
  readonly children: ReactNode;
}

/**
 * Split layout shared by login and signup. The value panel is decorative
 * reinforcement, so it is dropped entirely below the md breakpoint rather than
 * stacked — on a phone it would just push the form below the fold.
 */
export const AuthLayout = ({ title, subtitle, children }: AuthLayoutProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const locale = useAppSelector(selectLocale);
  const theme = useAppSelector(selectTheme);
  const { t } = useTranslation();

  return (
    <div className={styles.shell}>
      <div className={styles.formSide}>
        <div className={styles.topBar}>
          <Link to="/" className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              JM
            </span>
            {t('app.name')}
          </Link>

          <div className={styles.topActions}>
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
          </div>
        </div>

        <main id="main" className={styles.formWrapper}>
          <div className={styles.form}>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>
            {children}
          </div>
        </main>
      </div>

      <aside className={styles.panel} aria-hidden="true">
        <span className={styles.panelGlow} />
        <h2 className={styles.panelTitle}>{t('auth.panelTitle')}</h2>

        <ul className={styles.panelList}>
          {[t('auth.panelPoint1'), t('auth.panelPoint2'), t('auth.panelPoint3')].map((point) => (
            <li key={point} className={styles.panelPoint}>
              <span className={styles.panelMark}>✓</span>
              {point}
            </li>
          ))}
        </ul>

        <div className={styles.panelStat}>
          <span className={styles.panelStatValue}>2 min</span>
          <span className={styles.panelStatLabel}>{t('landing.stats.time')}</span>
        </div>
      </aside>
    </div>
  );
};
