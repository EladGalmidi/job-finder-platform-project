import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { Spinner } from '../Spinner/Spinner';

import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonClasses';
import styles from './Button.module.css';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly isLoading?: boolean;
  /**
   * The action this button performs has already been done. Renders
   * non-interactive, but as a completed state rather than a disabled one — a
   * greyed-out "Applied" reads as a broken control, not as good news.
   */
  readonly isComplete?: boolean;
  readonly fullWidth?: boolean;
  readonly iconStart?: ReactNode;
  readonly iconEnd?: ReactNode;
}

/**
 * While loading, the label is hidden with `visibility` rather than unmounted so
 * the button keeps its width and the layout does not jump mid-submit.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    isComplete = false,
    fullWidth = false,
    iconStart,
    iconEnd,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  const classes = [buttonClasses({ variant, size, fullWidth }), isComplete ? styles.complete : '']
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled === true || isLoading || isComplete}
      aria-busy={isLoading}
    >
      <span className={isLoading ? styles.loadingContent : undefined}>
        {iconStart}
        {children}
        {iconEnd}
      </span>
      {isLoading ? (
        <span className={styles.spinner}>
          <Spinner size={size === 'lg' ? 'md' : 'sm'} />
        </span>
      ) : null}
    </button>
  );
});
