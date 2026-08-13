import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface RadioCardGroupProps {
  readonly labelledBy: string;
  readonly className?: string | undefined;
  readonly children: ReactNode;
}

const KEYS = new Set(['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End']);

/**
 * Keyboard behaviour for a group of `OptionCard`s in `single` mode.
 *
 * `role="radiogroup"` is a promise: arrow keys move between options and the
 * group is a single tab stop. Without it every card is its own tab stop and the
 * arrows do nothing, which is worse than plain buttons because the role tells
 * assistive tech to expect the radio pattern.
 *
 * Roving tabindex is applied to the rendered cards rather than requiring each
 * caller to thread it through, and selection follows focus the way native radios
 * do — moving with an arrow key also picks that option.
 */
export const RadioCardGroup = ({
  labelledBy,
  className,
  children,
}: RadioCardGroupProps): React.JSX.Element => {
  const ref = useRef<HTMLDivElement>(null);

  const radios = (): HTMLElement[] =>
    Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="radio"]') ?? []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!KEYS.has(event.key)) return;

    const items = radios();
    if (items.length === 0) return;

    const current = items.indexOf(document.activeElement as HTMLElement);
    if (current < 0) return;

    // Right/left follow the writing direction, so the arrows keep pointing at
    // the option the user sees next in both LTR and Hebrew.
    const forward =
      getComputedStyle(event.currentTarget).direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const back = forward === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight';

    let next = current;
    if (event.key === forward || event.key === 'ArrowDown') next = (current + 1) % items.length;
    else if (event.key === back || event.key === 'ArrowUp')
      next = (current - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else next = items.length - 1;

    event.preventDefault();
    const target = items[next];
    target?.focus();
    target?.click();
  };

  return (
    // The group itself is deliberately not focusable: in the radio pattern the
    // roving tabindex lives on the radios, and the handler only needs the event
    // to bubble from whichever one has focus. Making the container a tab stop
    // would add the extra stop this component exists to remove.
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div
      ref={ref}
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={className}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
};
