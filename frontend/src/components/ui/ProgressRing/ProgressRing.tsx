import type { ReactNode } from 'react';

import styles from './ProgressRing.module.css';

export interface ProgressRingProps {
  /** 0-100. */
  readonly value: number;
  readonly size?: number;
  readonly thickness?: number;
  readonly color?: string;
  readonly caption?: string;
  readonly children?: ReactNode;
  /** Required: the ring is an image to assistive technology. */
  readonly label: string;
}

/**
 * Hand-rolled SVG ring — no chart library.
 *
 * The visual is aria-hidden and the accessible value is exposed through
 * role="progressbar", so screen readers get a number rather than a description
 * of a circle.
 */
export const ProgressRing = ({
  value,
  size = 120,
  thickness = 10,
  color = 'var(--color-primary)',
  caption,
  children,
  label,
}: ProgressRingProps): React.JSX.Element => {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div
      className={styles.wrapper}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      style={{ inlineSize: size, blockSize: size }}
    >
      <svg className={styles.svg} width={size} height={size} aria-hidden="true" focusable="false">
        <circle
          className={styles.track}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={thickness}
        />
        <circle
          className={styles.indicator}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={thickness}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>

      <div className={styles.content} aria-hidden="true">
        {children ?? <span className={styles.value}>{Math.round(clamped)}</span>}
        {caption === undefined ? null : <span className={styles.caption}>{caption}</span>}
      </div>
    </div>
  );
};
