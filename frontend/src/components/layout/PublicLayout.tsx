import { Link, Outlet } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { ToastViewport } from '@/components/ui/Toast/ToastViewport';
import { localeSet, selectLocale, selectTheme, themeToggled } from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';

import styles from './PublicLayout.module.css';

/**
 * The language switcher lives here as well as in the app topbar — a Hebrew
 * visitor has to be able to switch before signing up, not after.
 */
export const PublicLayout = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const locale = useAppSelector(selectLocale);
  const theme = useAppSelector(selectTheme);
  const { t } = useTranslation();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <span className={styles.mark} aria-hidden="true">
            JM
          </span>
          {t('app.name')}
        </Link>

        <div className={styles.actions}>
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
      </header>

      <main id="main" className={styles.content}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        {t('app.name')} — {t('app.tagline')}
      </footer>

      <ToastViewport />
    </div>
  );
};
