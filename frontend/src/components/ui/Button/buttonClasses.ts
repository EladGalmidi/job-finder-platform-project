import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: styles.sizeSm ?? '',
  md: styles.sizeMd ?? '',
  lg: styles.sizeLg ?? '',
};

export interface ButtonSkin {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly fullWidth?: boolean;
}

/**
 * The class list for a button-shaped control.
 *
 * Lives apart from `Button` so `LinkButton` can wear the same skin without
 * either file exporting both a component and a helper, which breaks fast
 * refresh.
 */
export const buttonClasses = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
}: ButtonSkin): string =>
  [
    styles.button,
    styles.relative,
    SIZE_CLASS[size],
    styles[variant],
    fullWidth ? styles.fullWidth : '',
  ]
    .filter(Boolean)
    .join(' ');
