import { useState } from 'react';

import { Input } from '@/components/ui/Input/Input';
import { useTranslation } from '@/i18n/useTranslation';
import { cx } from '@/lib/cx';
import { passwordStrength, type PasswordStrength } from '@/lib/passwordStrength';

import styles from '../Auth.module.css';

export interface PasswordFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onBlur?: () => void;
  readonly error?: string;
  readonly hint?: string;
  readonly showStrength?: boolean;
  readonly autoComplete?: string;
  readonly required?: boolean;
}

const SEGMENT_CLASS: Record<PasswordStrength, string> = {
  weak: styles.strengthWeak ?? '',
  fair: styles.strengthFair ?? '',
  strong: styles.strengthStrong ?? '',
};

const FILLED_SEGMENTS: Record<PasswordStrength, number> = { weak: 1, fair: 2, strong: 3 };

export const PasswordField = ({
  value,
  onChange,
  onBlur,
  error,
  hint,
  showStrength = false,
  autoComplete = 'current-password',
  required = false,
}: PasswordFieldProps): React.JSX.Element => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  const strength = passwordStrength(value);
  const filled = FILLED_SEGMENTS[strength];

  return (
    <div>
      <Input
        label={t('auth.password')}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        {...(onBlur === undefined ? {} : { onBlur })}
        {...(error === undefined ? {} : { error })}
        {...(hint === undefined ? {} : { hint })}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? t('common.hidePassword') : t('common.showPassword')}
            aria-pressed={visible}
          >
            <span aria-hidden="true">{visible ? '🙈' : '👁'}</span>
          </button>
        }
      />

      {showStrength && value !== '' ? (
        <div className={styles.strength}>
          <div className={styles.strengthTrack} aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className={cx(styles.strengthSegment, index < filled && SEGMENT_CLASS[strength])}
              />
            ))}
          </div>
          {/* The meter is decorative; this line is what gets announced. */}
          <p className={styles.strengthLabel} aria-live="polite">
            {t('password.strengthLabel', { level: t(`password.${strength}`) })}
          </p>
        </div>
      ) : null}
    </div>
  );
};
