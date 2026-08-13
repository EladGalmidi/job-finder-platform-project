import { cx } from '@/lib/cx';

import styles from './SkillTag.module.css';

export type SkillTagVariant = 'neutral' | 'have' | 'missing';

export interface SkillTagProps {
  readonly name: string;
  readonly variant?: SkillTagVariant;
}

const GLYPH: Record<SkillTagVariant, string | null> = {
  neutral: null,
  have: '✓',
  missing: '✕',
};

/**
 * A glyph accompanies the colour so "you have this" and "you are missing this"
 * are distinguishable without colour vision.
 */
export const SkillTag = ({ name, variant = 'neutral' }: SkillTagProps): React.JSX.Element => {
  const glyph = GLYPH[variant];

  return (
    <span className={cx(styles.tag, styles[variant])}>
      {glyph === null ? null : <span aria-hidden="true">{glyph}</span>}
      {name}
    </span>
  );
};

export const SkillOverflow = ({ count }: { count: number }): React.JSX.Element => (
  <span className={cx(styles.tag, styles.more)}>+{count}</span>
);
