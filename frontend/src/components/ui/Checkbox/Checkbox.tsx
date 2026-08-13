import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

import styles from './Checkbox.module.css';

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'id' | 'type'> {
  readonly label: ReactNode;
  readonly error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, error, ...rest },
  ref,
) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <div className={styles.wrapper}>
        <input
          {...rest}
          ref={ref}
          id={id}
          type="checkbox"
          className={styles.input}
          aria-invalid={error !== undefined}
          aria-describedby={error === undefined ? undefined : errorId}
        />
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      </div>
      {error === undefined ? null : (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
