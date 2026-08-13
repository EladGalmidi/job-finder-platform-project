import { useEffect, useId, useRef, type ReactNode } from 'react';

import { useFocusTrap } from '@/lib/a11y/useFocusTrap';

import styles from './Drawer.module.css';

export interface DrawerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly closeLabel: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  /** Rendered next to the title, e.g. a match score. */
  readonly headerAside?: ReactNode;
}

/**
 * Side panel on desktop, full-screen view on mobile — one component, because the
 * two are the same content with different framing.
 *
 * Focus is trapped while open, Escape closes, and focus returns to the trigger
 * on close (all handled by useFocusTrap). Background scrolling is locked without
 * a layout shift by compensating for the scrollbar width.
 */
export const Drawer = ({
  isOpen,
  onClose,
  title,
  closeLabel,
  children,
  footer,
  headerAside,
}: DrawerProps): React.JSX.Element | null => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useFocusTrap(panelRef, { isActive: isOpen, onEscape: onClose });

  useEffect(() => {
    if (!isOpen) return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingInlineEnd;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingInlineEnd = `${String(scrollbarWidth)}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingInlineEnd = previousPadding;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Decorative scrim. Escape and the close button are the accessible paths,
          so this does not need to be a button. */}
      <div className={styles.overlay} onClick={onClose} aria-hidden="true" />

      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {headerAside}
            <button type="button" className={styles.close} onClick={onClose} aria-label={closeLabel}>
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </header>

        <div className={styles.body}>{children}</div>

        {footer === undefined ? null : <footer className={styles.footer}>{footer}</footer>}
      </div>
    </>
  );
};
