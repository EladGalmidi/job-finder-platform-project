import { useEffect, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const focusableWithin = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  );

export interface FocusTrapOptions {
  readonly isActive: boolean;
  readonly onEscape?: () => void;
}

/**
 * Traps Tab within a container, restores focus to the previously focused element
 * on close, and wires Escape.
 *
 * Shared by Modal, Drawer and BottomSheet — three presentations, one trap. Three
 * separate implementations would mean three sets of focus bugs.
 */
export const useFocusTrap = (
  containerRef: RefObject<HTMLElement | null>,
  { isActive, onEscape }: FocusTrapOptions,
): void => {
  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (container === null) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const initial = focusableWithin(container)[0] ?? container;
    initial.focus();

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onEscape?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = focusableWithin(container);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (first === undefined || last === undefined) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [containerRef, isActive, onEscape]);
};
