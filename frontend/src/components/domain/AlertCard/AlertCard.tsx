import { LinkButton } from '@/components/ui/Button/LinkButton';
import { useTranslation } from '@/i18n/useTranslation';
import { cx } from '@/lib/cx';
import { formatRelativeTime } from '@/lib/format';
import type { Alert, AlertSeverity } from '@/types';

import styles from './AlertCard.module.css';

const ICON: Record<AlertSeverity, string> = {
  info: 'i',
  success: '✓',
  warning: '!',
  danger: '!',
};

const ICON_CLASS: Record<AlertSeverity, string> = {
  info: styles.iconinfo ?? '',
  success: styles.iconsuccess ?? '',
  warning: styles.iconwarning ?? '',
  danger: styles.icondanger ?? '',
};

export interface AlertCardProps {
  readonly alert: Alert;
  readonly onDismiss: () => void;
  readonly isDismissing: boolean;
}

export const AlertCard = ({ alert, onDismiss, isDismissing }: AlertCardProps): React.JSX.Element => {
  const { t, locale } = useTranslation();

  return (
    <article className={cx(styles.card, styles[alert.severity])}>
      <span className={cx(styles.icon, ICON_CLASS[alert.severity])} aria-hidden="true">
        {ICON[alert.severity]}
      </span>

      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{alert.title}</h3>
          {alert.isRead ? null : (
            <span className={styles.unread} aria-label={t('topbar.notifications')} />
          )}
        </div>

        <p className={styles.text}>{alert.body}</p>

        <div className={styles.actions}>
          {alert.actionRoute === null ? null : (
            <LinkButton to={alert.actionRoute} size="sm" variant="secondary">
              {t('jobs.viewDetails')}
            </LinkButton>
          )}
          <span className={styles.time}>{formatRelativeTime(locale, alert.createdAt)}</span>
        </div>
      </div>

      <button
        type="button"
        className={styles.dismiss}
        onClick={onDismiss}
        disabled={isDismissing}
        aria-label={t('common.dismiss')}
      >
        <span aria-hidden="true">✕</span>
      </button>
    </article>
  );
};
