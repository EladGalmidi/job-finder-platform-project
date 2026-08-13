import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useTranslation } from '@/i18n/useTranslation';
import { cx } from '@/lib/cx';

import styles from '../Auth.module.css';

export interface SocialButtonsProps {
  readonly onSelect: (provider: 'google' | 'linkedin') => void;
  readonly pendingProvider: 'google' | 'linkedin' | null;
  readonly disabled: boolean;
}

/** Mock OAuth entry points. Both resolve through the same auth thunks. */
export const SocialButtons = ({
  onSelect,
  pendingProvider,
  disabled,
}: SocialButtonsProps): React.JSX.Element => {
  const { t } = useTranslation();

  return (
    <div className={styles.socialRow}>
      <button
        type="button"
        className={styles.socialButton}
        onClick={() => onSelect('google')}
        disabled={disabled}
        aria-busy={pendingProvider === 'google'}
      >
        {pendingProvider === 'google' ? (
          <Spinner size="sm" />
        ) : (
          <span className={cx(styles.socialGlyph, styles.googleGlyph)} aria-hidden="true">
            G
          </span>
        )}
        {t('auth.continueWithGoogle')}
      </button>

      <button
        type="button"
        className={styles.socialButton}
        onClick={() => onSelect('linkedin')}
        disabled={disabled}
        aria-busy={pendingProvider === 'linkedin'}
      >
        {pendingProvider === 'linkedin' ? (
          <Spinner size="sm" />
        ) : (
          <span className={cx(styles.socialGlyph, styles.linkedinGlyph)} aria-hidden="true">
            in
          </span>
        )}
        {t('auth.continueWithLinkedin')}
      </button>
    </div>
  );
};
