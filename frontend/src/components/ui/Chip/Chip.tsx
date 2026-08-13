import { cx } from '@/lib/cx';

import styles from './Chip.module.css';

export interface ChipProps {
  readonly label: string;
  readonly selected: boolean;
  readonly onToggle: () => void;
  readonly disabled?: boolean;
}

/**
 * Multi-select toggle.
 *
 * `aria-pressed` gives assistive technology the state, and a checkmark backs up
 * the colour change so selection is not communicated by colour alone.
 */
export const Chip = ({ label, selected, onToggle, disabled = false }: ChipProps): React.JSX.Element => (
  <button
    type="button"
    className={cx(styles.chip, selected && styles.selected)}
    aria-pressed={selected}
    disabled={disabled}
    onClick={onToggle}
  >
    {selected ? (
      <span className={styles.check} aria-hidden="true">
        ✓
      </span>
    ) : null}
    {label}
  </button>
);
