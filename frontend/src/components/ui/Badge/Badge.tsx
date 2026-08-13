import type { ReactNode } from 'react';

import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
  readonly children: ReactNode;
  readonly tone?: BadgeTone;
  readonly outline?: boolean;
  /** Decorative glyph. Always paired with text — never the only signal. */
  readonly icon?: ReactNode;
}

export const Badge = ({
  children,
  tone = 'neutral',
  outline = false,
  icon,
}: BadgeProps): React.JSX.Element => (
  <span
    className={[styles.badge, styles[tone], outline ? styles.outline : ''].filter(Boolean).join(' ')}
  >
    {icon === undefined ? null : <span aria-hidden="true">{icon}</span>}
    {children}
  </span>
);
