import styles from './PagePlaceholder.module.css';

export interface PagePlaceholderProps {
  readonly title: string;
  readonly phase: string;
  readonly body: string;
}

/**
 * Route target for pages not yet built. Phase 2 delivers the foundation only —
 * these confirm routing, guards and layout work without pretending the product
 * pages exist.
 */
export const PagePlaceholder = ({
  title,
  phase,
  body,
}: PagePlaceholderProps): React.JSX.Element => (
  <section className={styles.wrapper}>
    <span className={styles.phase}>{phase}</span>
    <h2 className={styles.title}>{title}</h2>
    <p className={styles.body}>{body}</p>
  </section>
);
