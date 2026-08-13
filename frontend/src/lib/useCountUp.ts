import { useEffect, useRef, useState } from 'react';

const DEFAULT_DURATION_MS = 900;

/** Ease-out cubic: fast at first, settles gently on the final value. */
const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * True when the animation must not run at all and the final value should be
 * shown immediately.
 *
 * Reduced motion is the obvious case. A hidden document is the important one:
 * browsers pause requestAnimationFrame on background tabs, so animating there
 * would leave a literal "0" in the DOM where a score belongs until the tab is
 * focused. The number is data, not decoration — it must always be correct even
 * when the animation cannot play.
 */
const shouldSkipAnimation = (): boolean =>
  prefersReducedMotion() || (typeof document !== 'undefined' && document.hidden);

/**
 * Animates a number from zero to `target` with requestAnimationFrame, falling
 * straight to the final value whenever animating is inappropriate or impossible.
 */
export const useCountUp = (target: number, durationMs = DEFAULT_DURATION_MS): number => {
  const [value, setValue] = useState(() => (shouldSkipAnimation() ? target : 0));
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (shouldSkipAnimation()) {
      setValue(target);
      return;
    }

    const start = performance.now();

    const tick = (now: number): void => {
      const progress = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(easeOut(progress) * target));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs]);

  return value;
};
