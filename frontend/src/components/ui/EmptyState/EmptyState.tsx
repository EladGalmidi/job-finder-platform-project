import type { ReactNode } from 'react';

import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  readonly title: string;
  readonly body?: string;
  readonly icon?: ReactNode;
  readonly action?: ReactNode;
  /** Renders the error variant; also switches the live-region politeness. */
  readonly tone?: 'neutral' | 'danger';
}

export const EmptyState = ({
  title,
  body,
  icon,
  action,
  tone = 'neutral',
}: EmptyStateProps): React.JSX.Element => (
  <div className={styles.wrapper} role={tone === 'danger' ? 'alert' : 'status'}>
    {icon === undefined ? null : (
      <span
        className={[styles.icon, tone === 'danger' ? styles.danger : ''].filter(Boolean).join(' ')}
        aria-hidden="true"
      >
        {icon}
      </span>
    )}
    <h2 className={styles.title}>{title}</h2>
    {body === undefined ? null : <p className={styles.body}>{body}</p>}
    {action === undefined ? null : <div className={styles.action}>{action}</div>}
  </div>
);
