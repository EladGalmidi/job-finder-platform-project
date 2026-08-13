import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { ToastViewport } from '@/components/ui/Toast/ToastViewport';
import { fetchApplications } from '@/features/applications/applicationsSlice';
import { fetchAlerts } from '@/features/insights/insightsSlice';
import { selectRefreshToken, selectSidebarCollapsed } from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';

import { MobileTabBar } from './MobileTabBar';
import { NAV_ITEMS } from './navItems';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import styles from './AppLayout.module.css';

export const AppLayout = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector(selectSidebarCollapsed);
  const refreshToken = useAppSelector(selectRefreshToken);
  const location = useLocation();
  const { t } = useTranslation();

  /**
   * Alerts and applications drive the sidebar and topbar badges on every page,
   * so they are loaded once by the shell rather than by each page separately.
   */
  useEffect(() => {
    void dispatch(fetchAlerts());
    void dispatch(fetchApplications({ q: '', statuses: [], sort: 'recent' }));
  }, [dispatch, refreshToken]);

  // Longest matching prefix wins: /dashboard/jobs must not resolve to Dashboard
  // just because it starts with it.
  const current = [...NAV_ITEMS]
    .filter((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))
    .sort((left, right) => right.to.length - left.to.length)[0];

  const title = current === undefined ? t('app.name') : t(current.labelKey);

  return (
    <div className={collapsed ? styles.shellCollapsed : styles.shell}>
      <Sidebar />

      <div className={styles.main}>
        <a className="skipLink" href="#main">
          {t('nav.skipToContent')}
        </a>
        <Topbar title={title} />
        <main id="main" className={styles.content}>
          <Outlet />
        </main>
      </div>

      <MobileTabBar />
      <ToastViewport />
    </div>
  );
};
