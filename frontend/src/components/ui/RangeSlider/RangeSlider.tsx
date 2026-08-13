import { useId } from 'react';

import styles from './RangeSlider.module.css';

export interface RangeSliderProps {
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly valueMin: number;
  readonly valueMax: number;
  readonly onChange: (next: { min: number; max: number }) => void;
  readonly minLabel: string;
  readonly maxLabel: string;
  readonly formatValue: (value: number) => string;
  readonly hint?: string;
}

/**
 * Dual-thumb range built from two native `<input type="range">` elements.
 *
 * The thumbs cannot cross: each handler clamps against the other. Percentages
 * are applied with logical `inset-inline` so the filled segment tracks the
 * writing direction instead of always growing from the left.
 */
export const RangeSlider = ({
  min,
  max,
  step,
  valueMin,
  valueMax,
  onChange,
  minLabel,
  maxLabel,
  formatValue,
  hint,
}: RangeSliderProps): React.JSX.Element => {
  const hintId = useId();

  const span = max - min;
  const startPercent = ((valueMin - min) / span) * 100;
  const endPercent = ((valueMax - min) / span) * 100;

  return (
    <div className={styles.wrapper}>
      <div className={styles.values}>
        <span className={styles.value}>
          <span className={styles.valueLabel}>{minLabel}</span>
          <span className={styles.valueAmount}>{formatValue(valueMin)}</span>
        </span>
        <span className={styles.value}>
          <span className={styles.valueLabel}>{maxLabel}</span>
          <span className={styles.valueAmount}>{formatValue(valueMax)}</span>
        </span>
      </div>

      <div className={styles.track}>
        <span className={styles.rail} />
        <span
          className={styles.fill}
          style={{
            insetInlineStart: `${String(startPercent)}%`,
            inlineSize: `${String(endPercent - startPercent)}%`,
          }}
        />

        <input
          type="range"
          className={styles.input}
          min={min}
          max={max}
          step={step}
          value={valueMin}
          aria-label={minLabel}
          aria-valuetext={formatValue(valueMin)}
          {...(hint === undefined ? {} : { 'aria-describedby': hintId })}
          onChange={(event) => {
            const next = Math.min(Number(event.target.value), valueMax - step);
            onChange({ min: next, max: valueMax });
          }}
        />

        <input
          type="range"
          className={styles.input}
          min={min}
          max={max}
          step={step}
          value={valueMax}
          aria-label={maxLabel}
          aria-valuetext={formatValue(valueMax)}
          {...(hint === undefined ? {} : { 'aria-describedby': hintId })}
          onChange={(event) => {
            const next = Math.max(Number(event.target.value), valueMin + step);
            onChange({ min: valueMin, max: next });
          }}
        />
      </div>

      {hint === undefined ? null : (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
    </div>
  );
};
