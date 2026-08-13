import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { Spinner } from '../Spinner/Spinner';

import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonClasses';
import styles from './Button.module.css';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly isLoading?: boolean;
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
  const classes = buttonClasses({ variant, size, fullWidth });

  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled === true || isLoading}
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
