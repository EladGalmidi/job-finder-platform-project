import { Link, type LinkProps } from 'react-router-dom';

import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonClasses';

export interface LinkButtonProps extends Omit<LinkProps, 'className'> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly fullWidth?: boolean;
}

/**
 * A link that looks like a button.
 *
 * Wrapping a `<Button>` in a `<Link>` produces `<a><button></button></a>`, which
 * the HTML spec forbids — interactive content cannot nest. In practice it gives
 * the control two tab stops and makes screen readers announce a link containing
 * a button. Anything that navigates should be an anchor; anything that acts on
 * the current page should be a `<Button>`.
 */
export const LinkButton = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  ...rest
}: LinkButtonProps): React.JSX.Element => (
  <Link {...rest} className={buttonClasses({ variant, size, fullWidth })}>
    <span>{children}</span>
  </Link>
);
