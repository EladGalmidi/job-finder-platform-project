import { NavLink } from 'react-router-dom';

import { useTranslation } from '@/i18n/useTranslation';

import { NAV_ITEMS } from './navItems';
import styles from './MobileTabBar.module.css';

/** Primary destinations only — five is the practical limit for a tab bar. */
export const MobileTabBar = (): React.JSX.Element => {
  const { t } = useTranslation();
  const items = NAV_ITEMS.filter((item) => item.primary);

  return (
    <nav className={styles.tabbar} aria-label={t('nav.dashboard')}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            [styles.tab, isActive ? styles.active : ''].filter(Boolean).join(' ')
          }
        >
          <span className={styles.glyph} aria-hidden="true">
            {item.glyph}
          </span>
          <span className={styles.label}>{t(item.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
};
