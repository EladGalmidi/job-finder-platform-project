import { ProgressRing } from '@/components/ui/ProgressRing/ProgressRing';
import { useTranslation } from '@/i18n/useTranslation';
import { cx } from '@/lib/cx';
import { scoreBand, scoreBandCssVar } from '@/lib/scoring';
import type { MatchBand } from '@/types';

import styles from './MatchScore.module.css';

export interface MatchScoreProps {
  readonly score: number;
  readonly size?: number;
  readonly showLabel?: boolean;
}

/**
 * Score is never communicated by colour alone.
 *
 * Every rendering carries three redundant signals: the band colour, a glyph, and
 * a text label. WCAG 1.4.1, and it is also just easier to scan.
 */
const BAND_GLYPH: Record<MatchBand, string> = {
  high: '●●●',
  medium: '●●○',
  low: '●○○',
};

const BAND_LABEL_KEY = {
  high: 'match.high',
  medium: 'match.medium',
  low: 'match.low',
} as const;

export const MatchScore = ({
  score,
  size = 64,
  showLabel = true,
}: MatchScoreProps): React.JSX.Element => {
  const { t } = useTranslation();
  const band = scoreBand(score);

  return (
    <div className={styles.wrapper}>
      <ProgressRing
        value={score}
        size={size}
        thickness={size > 80 ? 9 : 6}
        color={scoreBandCssVar(band)}
        label={t('match.scoreLabel', { score: Math.round(score) })}
      >
        <span className={cx(styles.band, styles[band])}>{Math.round(score)}%</span>
      </ProgressRing>

      {showLabel ? (
        <span className={styles.label}>
          <span className={cx(styles.band, styles[band])}>
            <span className={styles.glyph} aria-hidden="true">
              {BAND_GLYPH[band]}{' '}
            </span>
            {t(BAND_LABEL_KEY[band])}
          </span>
        </span>
      ) : null}
    </div>
  );
};
