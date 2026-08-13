import { Outlet, useLocation } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { ToastViewport } from '@/components/ui/Toast/ToastViewport';
import { Stepper } from '@/components/ui/Stepper/Stepper';
import { logout } from '@/features/auth/authSlice';
import type { OnboardingStep } from '@/features/auth/authSlice';
import { localeSet, selectLocale, selectTheme, themeToggled } from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';

import { useOnboardingSteps } from './useOnboardingSteps';
import styles from './Onboarding.module.css';

const stepFromPath = (pathname: string): OnboardingStep => {
  const last = pathname.split('/').filter(Boolean).at(-1);
  switch (last) {
    case 'preferences':
    case 'cv':
    case 'analyzing':
    case 'results':
      return last;
    default:
      return 'welcome';
  }
};

/**
 * Chrome for the onboarding flow: brand, controls and the progress indicator.
 * The step is derived from the URL rather than from store state so a direct
 * link or a refresh renders the correct progress immediately.
 */
export const OnboardingLayout = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const locale = useAppSelector(selectLocale);
  const theme = useAppSelector(selectTheme);
  const { t } = useTranslation();
  const { steps, indexOf } = useOnboardingSteps();

  const current = stepFromPath(location.pathname);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              JM
            </span>
            {t('app.name')}
          </span>

          <div className={styles.headerActions}>
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
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => void dispatch(logout())}
              aria-label={t('nav.signOut')}
            >
              <span aria-hidden="true">⏻</span>
            </button>
          </div>
        </div>

        <div className={styles.progressBar}>
          <Stepper
            steps={steps}
            currentIndex={indexOf(current)}
            ariaLabel={t('onboarding.progress')}
          />
        </div>
      </header>

      <main id="main" className={styles.main}>
        <Outlet />
      </main>

      <ToastViewport />
    </div>
  );
};
