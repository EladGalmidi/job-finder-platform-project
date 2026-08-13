import { forwardRef, useId, type SelectHTMLAttributes } from 'react';

import { cx } from '@/lib/cx';

import styles from './Select.module.css';

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'id' | 'children'> {
  readonly label: string;
  readonly options: readonly SelectOption[];
  readonly hint?: string;
  readonly error?: string;
  readonly hideLabel?: boolean;
}

/**
 * Native `<select>` rather than a custom listbox: it is keyboard-accessible,
 * screen-reader correct and uses the platform picker on mobile for free.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, hint, error, hideLabel = false, ...rest },
  ref,
) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = cx(hint === undefined ? '' : hintId, error === undefined ? '' : errorId);

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={hideLabel ? 'visuallyHidden' : styles.label}>
        {label}
      </label>

      <div className={styles.control}>
        <select
          {...rest}
          ref={ref}
          id={id}
          aria-invalid={error !== undefined}
          aria-describedby={describedBy === '' ? undefined : describedBy}
          className={cx(styles.select, error === undefined ? '' : styles.invalid)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className={styles.chevron} aria-hidden="true">
          ▾
        </span>
      </div>

      {hint === undefined ? null : (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error === undefined ? null : (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
