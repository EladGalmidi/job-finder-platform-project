import { useEffect, useId, useRef } from 'react';

import { useFocusTrap } from '@/lib/a11y/useFocusTrap';

import { Button } from '../Button/Button';

import styles from './ConfirmDialog.module.css';

export interface ConfirmDialogProps {
  readonly isOpen: boolean;
  readonly title: string;
  readonly body: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  /** `danger` styles the confirm button for a destructive action. */
  readonly tone?: 'danger' | 'primary';
  readonly isBusy?: boolean;
}

/**
 * Confirmation for a destructive action.
 *
 * Replaces `window.confirm`, which cannot be translated, ignores the theme,
 * renders outside the page in a way that looks like a browser warning rather
 * than part of the product, and blocks the main thread while it is open.
 *
 * Cancel takes initial focus rather than confirm: the safe option should be the
 * one a stray Enter press lands on. Escape cancels, and `useFocusTrap` returns
 * focus to whatever opened the dialog.
 */
export const ConfirmDialog = ({
  isOpen,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  tone = 'danger',
  isBusy = false,
}: ConfirmDialogProps): React.JSX.Element | null => {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useFocusTrap(panelRef, { isActive: isOpen, onEscape: onCancel });

  // useFocusTrap focuses the first tabbable element, which is the close-free
  // panel's first button. Cancel is placed first in the DOM for exactly that
  // reason, but focus it explicitly so the order of the footer can change
  // without silently moving initial focus onto the destructive action.
  useEffect(() => {
    if (isOpen) cancelRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onCancel} aria-hidden="true" />

      <div
        ref={panelRef}
        className={styles.panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
      >
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <p id={bodyId} className={styles.body}>
          {body}
        </p>

        <div className={styles.actions}>
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={isBusy}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isBusy}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </>
  );
};
