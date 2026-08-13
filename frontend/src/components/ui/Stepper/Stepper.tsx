import { useTranslation } from '@/i18n/useTranslation';
import { cx } from '@/lib/cx';

import styles from './Stepper.module.css';

export interface StepperStep {
  readonly id: string;
  readonly label: string;
}

export interface StepperProps {
  readonly steps: readonly StepperStep[];
  /** Zero-based index of the active step. */
  readonly currentIndex: number;
  readonly ariaLabel: string;
}

/**
 * Progress bar plus step list.
 *
 * The bar is a `progressbar` for assistive technology; the step labels are
 * decorative duplication of the same information, so they are hidden from the
 * accessibility tree to avoid announcing everything twice. Labels collapse on
 * small screens where only the bar and the "step N of M" text fit.
 */
export const Stepper = ({ steps, currentIndex, ariaLabel }: StepperProps): React.JSX.Element => {
  const { t } = useTranslation();

  const total = steps.length;
  const current = Math.min(Math.max(currentIndex, 0), total - 1);
  const percent = total <= 1 ? 100 : (current / (total - 1)) * 100;

  return (
    <div className={styles.wrapper}>
      <div className={styles.meta}>
        <span>{t('onboarding.stepOf', { current: current + 1, total })}</span>
        <span>{steps[current]?.label ?? ''}</span>
      </div>

      <div
        className={styles.bar}
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuenow={current + 1}
        aria-valuemin={1}
        aria-valuemax={total}
      >
        <div className={styles.fill} style={{ inlineSize: `${String(percent)}%` }} />
      </div>

      <ol className={styles.steps} aria-hidden="true">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={cx(
              styles.step,
              index < current && styles.done,
              index === current && styles.current,
            )}
          >
            <span className={styles.marker}>{index < current ? '✓' : index + 1}</span>
            <span className={styles.label}>{step.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
};
