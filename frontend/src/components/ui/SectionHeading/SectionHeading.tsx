import { cx } from '@/lib/cx';

import styles from './SectionHeading.module.css';

export interface SectionHeadingProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly centered?: boolean;
  readonly id?: string;
}

export const SectionHeading = ({
  eyebrow,
  title,
  subtitle,
  centered = false,
  id,
}: SectionHeadingProps): React.JSX.Element => (
  <header className={cx(styles.wrapper, centered && styles.centered)}>
    {eyebrow === undefined ? null : <span className={styles.eyebrow}>{eyebrow}</span>}
    <h2 id={id} className={styles.title}>
      {title}
    </h2>
    {subtitle === undefined ? null : <p className={styles.subtitle}>{subtitle}</p>}
  </header>
);
