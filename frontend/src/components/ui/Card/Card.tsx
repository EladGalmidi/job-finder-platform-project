import type { ElementType, ReactNode } from 'react';

import styles from './Card.module.css';

export interface CardProps {
  readonly children: ReactNode;
  readonly padding?: 'none' | 'sm' | 'md';
  readonly elevated?: boolean;
  readonly interactive?: boolean;
  /** `section` and `article` carry meaning; default `div` does not. */
  readonly as?: ElementType;
  readonly ariaLabelledBy?: string;
}

const PADDING_CLASS = {
  none: styles.paddingNone,
  sm: styles.paddingSm,
  md: styles.paddingMd,
} as const;

export const Card = ({
  children,
  padding = 'md',
  elevated = false,
  interactive = false,
  as: Tag = 'div',
  ariaLabelledBy,
}: CardProps): React.JSX.Element => {
  const classes = [
    styles.card,
    PADDING_CLASS[padding],
    elevated ? styles.elevated : '',
    interactive ? styles.interactive : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes} aria-labelledby={ariaLabelledBy}>
      {children}
    </Tag>
  );
};

export interface CardHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly action?: ReactNode;
  readonly titleId?: string;
}

export const CardHeader = ({
  title,
  subtitle,
  action,
  titleId,
}: CardHeaderProps): React.JSX.Element => (
  <div className={styles.header}>
    <div>
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      {subtitle === undefined ? null : <p className={styles.subtitle}>{subtitle}</p>}
    </div>
    {action}
  </div>
);
