import { NavLink } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { logout, selectCurrentUser } from '@/features/auth/authSlice';
import { selectAllApplications } from '@/features/applications/applicationsSlice';
import { selectUnreadAlertCount } from '@/features/insights/insightsSlice';
import {
  selectSidebarCollapsed,
  selectUpgradeDismissed,
  sidebarToggled,
  upgradeDismissed,
} from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';
import { cx } from '@/lib/cx';

import { NAV_ITEMS } from './navItems';
import styles from './Sidebar.module.css';

const initials = (name: string): string =>
  name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

export const Sidebar = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector(selectSidebarCollapsed);
  const isUpgradeDismissed = useAppSelector(selectUpgradeDismissed);
  const user = useAppSelector(selectCurrentUser);
  const unreadAlerts = useAppSelector(selectUnreadAlertCount);
  const applications = useAppSelector(selectAllApplications);
  const { t } = useTranslation();

  const activeApplications = applications.filter(
    (application) => application.status !== 'rejected',
  ).length;

  /** Counts shown against nav rows. Zero renders nothing rather than a "0". */
  const badgeFor = (to: string): number | null => {
    if (to === '/dashboard') return unreadAlerts > 0 ? unreadAlerts : null;
    if (to === '/applications') return activeApplications > 0 ? activeApplications : null;
    return null;
  };

  return (
    <aside
      className={cx(styles.sidebar, collapsed && styles.collapsed)}
      aria-label={t('app.name')}
    >
      <div className={styles.brand}>
        <span className={styles.mark} aria-hidden="true">
          JM
        </span>
        <span className={styles.brandText}>{t('app.name')}</span>
      </div>

      <nav className={styles.nav} aria-label={t('nav.dashboard')}>
        {NAV_ITEMS.map((item) => {
          const badge = badgeFor(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) => cx(styles.link, isActive && styles.active)}
              title={collapsed ? t(item.labelKey) : undefined}
            >
              <span className={styles.glyph} aria-hidden="true">
                {item.glyph}
              </span>
              <span className={styles.label}>{t(item.labelKey)}</span>
              {badge === null ? null : (
                <span className={styles.badge} aria-label={t('topbar.notifications')}>
                  {badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className={styles.footer}>
        {isUpgradeDismissed || collapsed ? null : (
          <div className={styles.upgrade}>
            <button
              type="button"
              className={styles.upgradeDismiss}
              onClick={() => dispatch(upgradeDismissed())}
              aria-label={t('sidebar.upgradeDismiss')}
            >
              <span aria-hidden="true">✕</span>
            </button>
            <p className={styles.upgradeTitle}>{t('sidebar.upgradeTitle')}</p>
            <p className={styles.upgradeBody}>{t('sidebar.upgradeBody')}</p>
            <NavLink to="/settings" className={() => styles.upgradeCta ?? ''}>
              {t('sidebar.upgradeCta')}
            </NavLink>
          </div>
        )}

        <div className={styles.user}>
          <span className={styles.userAvatar} aria-hidden="true">
            {user === null ? '?' : initials(user.fullName)}
          </span>
          <span className={styles.userBody}>
            <span className={styles.userName}>{user?.fullName ?? ''}</span>
            <span className={styles.userMeta}>{user?.email ?? ''}</span>
          </span>
          <button
            type="button"
            className={styles.userAction}
            onClick={() => void dispatch(logout())}
            aria-label={t('nav.signOut')}
          >
            <span aria-hidden="true">⏻</span>
          </button>
        </div>

        <button
          type="button"
          className={styles.collapseButton}
          onClick={() => dispatch(sidebarToggled())}
          aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
        >
          <span className={styles.glyph} aria-hidden="true">
            {collapsed ? '»' : '«'}
          </span>
          <span className={styles.label}>{t('nav.collapseSidebar')}</span>
        </button>
      </div>
    </aside>
  );
};
