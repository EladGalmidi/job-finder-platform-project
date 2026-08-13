import { cx } from '@/lib/cx';

import styles from './Skeleton.module.css';

export interface SkeletonProps {
  readonly variant?: 'text' | 'circle' | 'block';
  readonly width?: string;
  readonly height?: string;
  readonly count?: number;
}

/**
 * Purely decorative: skeletons are aria-hidden and the surrounding
 * QueryBoundary owns the `aria-busy` announcement.
 */
export const Skeleton = ({
  variant = 'text',
  width = '100%',
  height,
  count = 1,
}: SkeletonProps): React.JSX.Element => (
  <>
    {Array.from({ length: count }, (_, index) => (
      <span
        key={index}
        aria-hidden="true"
        className={cx(styles.skeleton, styles[variant])}
        style={{
          display: 'block',
          inlineSize: width,
          ...(height === undefined ? {} : { blockSize: height }),
          marginBlockEnd: count > 1 ? 'var(--space-2)' : undefined,
        }}
      />
    ))}
  </>
);
