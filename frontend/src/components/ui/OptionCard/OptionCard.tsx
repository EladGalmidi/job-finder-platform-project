import { cx } from '@/lib/cx';

import styles from './OptionCard.module.css';

export interface OptionCardProps {
  readonly title: string;
  readonly description?: string;
  readonly glyph?: string;
  readonly selected: boolean;
  readonly onSelect: () => void;
  /** `single` renders as a radio, `multiple` as a toggle button. */
  readonly mode?: 'single' | 'multiple';
}

/**
 * A larger, more scannable alternative to a radio list for short option sets.
 * Exposes radio semantics in `single` mode so arrow-key navigation and screen
 * reader announcements behave the way users expect.
 */
export const OptionCard = ({
  title,
  description,
  glyph,
  selected,
  onSelect,
  mode = 'single',
}: OptionCardProps): React.JSX.Element => (
  <button
    type="button"
    className={cx(styles.card, selected && styles.selected)}
    onClick={onSelect}
    {...(mode === 'single'
      ? { role: 'radio', 'aria-checked': selected }
      : { 'aria-pressed': selected })}
  >
    {selected ? (
      <span className={styles.check} aria-hidden="true">
        ✓
      </span>
    ) : null}
    {glyph === undefined ? null : (
      <span className={styles.glyph} aria-hidden="true">
        {glyph}
      </span>
    )}
    <span className={styles.title}>{title}</span>
    {description === undefined ? null : (
      <span className={styles.description}>{description}</span>
    )}
  </button>
);
