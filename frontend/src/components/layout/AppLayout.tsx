import { Outlet, useLocation } from 'react-router-dom';

import { useAppSelector } from '@/app/hooks';
import { ToastViewport } from '@/components/ui/Toast/ToastViewport';
import { selectSidebarCollapsed } from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';

import { MobileTabBar } from './MobileTabBar';
import { NAV_ITEMS } from './navItems';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import styles from './AppLayout.module.css';

export const AppLayout = (): React.JSX.Element => {
  const collapsed = useAppSelector(selectSidebarCollapsed);
  const location = useLocation();
  const { t } = useTranslation();

  const current = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to));
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
