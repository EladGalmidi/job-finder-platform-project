import { cx } from '@/lib/cx';

import styles from './Spinner.module.css';

export interface SpinnerProps {
  readonly size?: 'sm' | 'md' | 'lg';
  /** Accessible label; omit only when an ancestor already announces the wait. */
  readonly label?: string;
}

export const Spinner = ({ size = 'md', label }: SpinnerProps): React.JSX.Element => (
  <span
    className={cx(styles.spinner, styles[size])}
    role={label === undefined ? 'presentation' : 'status'}
    {...(label === undefined ? { 'aria-hidden': true } : { 'aria-label': label })}
  />
);
