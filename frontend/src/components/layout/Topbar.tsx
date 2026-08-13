import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { logout, selectCurrentUser } from '@/features/auth/authSlice';
import { localeSet, selectLocale, selectTheme, themeToggled } from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';
import { cx } from '@/lib/cx';

import styles from './Topbar.module.css';

export interface TopbarProps {
  readonly title: string;
}

const initials = (name: string): string =>
  name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

export const Topbar = ({ title }: TopbarProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const theme = useAppSelector(selectTheme);
  const locale = useAppSelector(selectLocale);
  const { t } = useTranslation();

  return (
    <header className={styles.topbar}>
      <h1 className={styles.title}>{title}</h1>
      <span className={styles.mobileBrand}>{t('app.name')}</span>

      <div className={styles.actions}>
        <button
          type="button"
          className={cx(styles.iconButton, styles.localeButton)}
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

        <span className={styles.avatar} aria-hidden="true">
          {user === null ? '?' : initials(user.fullName)}
        </span>
      </div>
    </header>
  );
};
