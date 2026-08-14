import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectCurrentUser } from '@/features/auth/authSlice';
import { selectUnreadAlertCount } from '@/features/insights/insightsSlice';
import {
  dataRefreshRequested,
  filtersOpened,
  localeSet,
  selectLocale,
  selectTheme,
  themeToggled,
  toastPushed,
} from '@/features/ui/uiSlice';
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
  const navigate = useNavigate();
  const user = useAppSelector(selectCurrentUser);
  const theme = useAppSelector(selectTheme);
  const locale = useAppSelector(selectLocale);
  const unreadAlerts = useAppSelector(selectUnreadAlertCount);
  const { t } = useTranslation();

  const [term, setTerm] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    if (!isSpinning) return;
    const timer = setTimeout(() => {
      setIsSpinning(false);
    }, 700);
    return () => {
      clearTimeout(timer);
    };
  }, [isSpinning]);

  /** Search always lands on the jobs list, whichever page it is used from. */
  const onSearch = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const query = term.trim();
    navigate(query === '' ? '/dashboard/jobs' : `/dashboard/jobs?q=${encodeURIComponent(query)}`);
  };

  const onFilters = (): void => {
    dispatch(filtersOpened());
    navigate('/dashboard/jobs');
  };

  const onRefresh = (): void => {
    setIsSpinning(true);
    dispatch(dataRefreshRequested());
    dispatch(toastPushed({ severity: 'info', title: t('dashboard.refreshed'), durationMs: 2500 }));
  };

  return (
    <header className={styles.topbar}>
      <h1 className={styles.title}>{title}</h1>
      <span className={styles.mobileBrand}>{t('app.name')}</span>

      <form className={styles.search} onSubmit={onSearch} role="search">
        <span className={styles.searchIcon} aria-hidden="true">
          ⌕
        </span>
        <input
          type="search"
          className={styles.searchInput}
          placeholder={t('topbar.searchPlaceholder')}
          aria-label={t('topbar.searchPlaceholder')}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
      </form>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onFilters}
          aria-label={t('topbar.filters')}
        >
          <span aria-hidden="true">⚟</span>
        </button>

        <button
          type="button"
          className={styles.iconButton}
          onClick={onRefresh}
          aria-label={t('topbar.refresh')}
        >
          <span className={cx(isSpinning && styles.spinning)} aria-hidden="true">
            ⟳
          </span>
        </button>

        <button
          type="button"
          className={cx(styles.iconButton, styles.labelledButton)}
          onClick={() => navigate('/dashboard/cv/upload')}
        >
          <span aria-hidden="true">↑</span>
          <span className={styles.updateCvLabel}>{t('topbar.updateCv')}</span>
        </button>

        <button
          type="button"
          className={styles.iconButton}
          onClick={() => navigate('/dashboard')}
          aria-label={t('topbar.notifications')}
        >
          <span aria-hidden="true">◔</span>
          {unreadAlerts > 0 ? <span className={styles.dot}>{unreadAlerts}</span> : null}
        </button>

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
          className={styles.avatar}
          onClick={() => navigate('/settings')}
          aria-label={t('topbar.account')}
        >
          <span aria-hidden="true">{user === null ? '?' : initials(user.fullName)}</span>
        </button>
      </div>
    </header>
  );
};
