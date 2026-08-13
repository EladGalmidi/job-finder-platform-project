import { Link } from 'react-router-dom';

import { Skeleton } from '@/components/ui/Skeleton/Skeleton';
import { cx } from '@/lib/cx';

import styles from './MetricCard.module.css';

export type MetricTone = 'primary' | 'success' | 'warning' | 'info';

export interface MetricCardProps {
  readonly label: string;
  /** Null renders the placeholder text instead of a number. */
  readonly value: number | string | null;
  readonly placeholder?: string;
  readonly hint?: string;
  readonly glyph: string;
  readonly tone?: MetricTone;
  readonly isLoading?: boolean;
  /** Turns the whole card into a link. */
  readonly to?: string;
}

const TONE_CLASS: Record<MetricTone, string> = {
  primary: styles.toneprimary ?? '',
  success: styles.tonesuccess ?? '',
  warning: styles.tonewarning ?? '',
  info: styles.toneinfo ?? '',
};

export const MetricCard = ({
  label,
  value,
  placeholder,
  hint,
  glyph,
  tone = 'primary',
  isLoading = false,
  to,
}: MetricCardProps): React.JSX.Element => {
  const content = (
    <>
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        <span className={cx(styles.icon, TONE_CLASS[tone])} aria-hidden="true">
          {glyph}
        </span>
      </div>

      {isLoading ? (
        <Skeleton variant="block" width="72px" height="32px" />
      ) : value === null ? (
        <span className={styles.valueMuted}>{placeholder ?? '—'}</span>
      ) : (
        <span className={styles.value}>{value}</span>
      )}

      {hint === undefined || isLoading ? null : <span className={styles.hint}>{hint}</span>}
    </>
  );

  if (to !== undefined) {
    return (
      <Link to={to} className={cx(styles.card, styles.interactive)}>
        {content}
      </Link>
    );
  }

  return <div className={styles.card}>{content}</div>;
};
