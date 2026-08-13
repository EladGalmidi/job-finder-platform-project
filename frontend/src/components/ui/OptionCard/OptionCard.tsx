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
 *
 * In `single` mode this carries radio semantics, which only hold up inside a
 * `RadioCardGroup` — that is what supplies the group role and the arrow-key
 * navigation the role implies. Roving tabindex lives here: an unselected radio
 * is skipped by Tab so the group is one stop, not five.
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
      ? { role: 'radio', 'aria-checked': selected, tabIndex: selected ? 0 : -1 }
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
