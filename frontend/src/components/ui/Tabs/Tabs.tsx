import { useRef } from 'react';

import { cx } from '@/lib/cx';

import styles from './Tabs.module.css';

export interface TabItem<T extends string> {
  readonly id: T;
  readonly label: string;
  readonly count?: number;
}

export interface TabsProps<T extends string> {
  readonly items: readonly TabItem<T>[];
  readonly value: T;
  readonly onChange: (next: T) => void;
  readonly ariaLabel: string;
}

/**
 * Tablist with roving tabindex and arrow-key navigation.
 *
 * These tabs change a URL query parameter rather than swapping panels, so there
 * is no `tabpanel` to point at — `aria-controls` is deliberately omitted rather
 * than pointed at something that does not exist.
 */
export const Tabs = <T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
}: TabsProps<T>): React.JSX.Element => {
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    const currentIndex = items.findIndex((item) => item.id === value);
    if (currentIndex < 0) return;

    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % items.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + items.length) % items.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = items.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const next = items[nextIndex];
    if (next === undefined) return;

    onChange(next.id);
    listRef.current?.querySelectorAll('button')[nextIndex]?.focus();
  };

  return (
    // The key handler lives on the tabs themselves rather than the tablist:
    // only a focusable element should carry keyboard behaviour, and the roving
    // tabindex already guarantees exactly one tab is focusable.
    <div ref={listRef} className={styles.list} role="tablist" aria-label={ariaLabel}>
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={cx(styles.tab, selected && styles.selected)}
            onClick={() => onChange(item.id)}
            onKeyDown={onKeyDown}
          >
            {item.label}
            {item.count === undefined ? null : <span className={styles.count}>{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
};
