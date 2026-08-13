import { NavLink } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectSidebarCollapsed, sidebarToggled } from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';

import { NAV_ITEMS } from './navItems';
import styles from './Sidebar.module.css';

export const Sidebar = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector(selectSidebarCollapsed);
  const { t } = useTranslation();

  return (
    <aside
      className={[styles.sidebar, collapsed ? styles.collapsed : ''].filter(Boolean).join(' ')}
      aria-label={t('app.name')}
    >
      <div className={styles.brand}>
        <span className={styles.mark} aria-hidden="true">
          JM
        </span>
        <span className={styles.brandText}>{t('app.name')}</span>
      </div>

      <nav className={styles.nav} aria-label={t('nav.dashboard')}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [styles.link, isActive ? styles.active : ''].filter(Boolean).join(' ')
            }
            title={collapsed ? t(item.labelKey) : undefined}
          >
            <span className={styles.glyph} aria-hidden="true">
              {item.glyph}
            </span>
            <span className={styles.label}>{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
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
