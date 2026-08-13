import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

import styles from './Input.module.css';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'id'> {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly trailing?: ReactNode;
  /** Hides the visual label but keeps it for assistive technology. */
  readonly hideLabel?: boolean;
}

/**
 * Label, hint and error are wired to the control through generated ids, so an
 * error can never be visually present but unannounced.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, trailing, hideLabel = false, required, ...rest },
  ref,
) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [hint === undefined ? null : hintId, error === undefined ? null : errorId]
    .filter((value): value is string => value !== null)
    .join(' ');

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={hideLabel ? 'visuallyHidden' : styles.label}>
        {label}
        {required === true ? (
          <span className={styles.required} aria-hidden="true">
            {' *'}
          </span>
        ) : null}
      </label>

      <div className={styles.control}>
        <input
          {...rest}
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error !== undefined}
          aria-describedby={describedBy === '' ? undefined : describedBy}
          className={[
            styles.input,
            error === undefined ? '' : styles.invalid,
            trailing === undefined ? '' : styles.hasTrailing,
          ]
            .filter(Boolean)
            .join(' ')}
        />
        {trailing === undefined ? null : <span className={styles.trailing}>{trailing}</span>}
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
