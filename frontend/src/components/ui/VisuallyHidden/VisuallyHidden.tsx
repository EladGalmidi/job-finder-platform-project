import type { ReactNode } from 'react';

import styles from './VisuallyHidden.module.css';

export interface VisuallyHiddenProps {
  readonly children: ReactNode;
  /** Render as a different element when the parent expects specific semantics. */
  readonly as?: 'span' | 'div';
}

/** Content for assistive technology only — never `display: none`. */
export const VisuallyHidden = ({ children, as = 'span' }: VisuallyHiddenProps): React.JSX.Element => {
  const Tag = as;
  return <Tag className={styles.hidden}>{children}</Tag>;
};
