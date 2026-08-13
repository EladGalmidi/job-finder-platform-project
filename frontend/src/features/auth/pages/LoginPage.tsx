import { useState, type FormEvent } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/Button/Button';
import { Card } from '@/components/ui/Card/Card';
import { Input } from '@/components/ui/Input/Input';
import { login, selectAuthError, selectSubmitStatus, socialLogin } from '@/features/auth/authSlice';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/types';

import styles from './LoginPage.module.css';

/**
 * Foundation-level form: enough to exercise the auth thunks, the guards and the
 * error path end to end. The designed sign-in experience lands in the auth phase.
 */
export const LoginPage = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectSubmitStatus);
  const error = useAppSelector(selectAuthError);
  const { t } = useTranslation();

  const [email, setEmail] = useState('demo@jobmatch.ai');
  const [password, setPassword] = useState('demo1234');
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void dispatch(login({ email, password }));
  };

  const invalidField = (field: string): boolean => error?.details?.[field] !== undefined;

  const emailError = invalidField('email') ? { error: t('error.VALIDATION_FAILED') } : {};
  const passwordError = invalidField('password') ? { error: t('error.VALIDATION_FAILED') } : {};

  return (
    <div className={styles.wrapper}>
      <Card>
        <h2 className={styles.title}>{t('auth.signIn')}</h2>
        <p className={styles.subtitle}>{t('app.tagline')}</p>

        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <Input
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            value={email}
            required
            onChange={(event) => setEmail(event.target.value)}
            {...emailError}
          />

          <Input
            label={t('auth.password')}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            required
            onChange={(event) => setPassword(event.target.value)}
            {...passwordError}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                <span aria-hidden="true">{showPassword ? '🙈' : '👁'}</span>
              </button>
            }
          />

          {error === null || error.code === 'VALIDATION_FAILED' ? null : (
            <p className={styles.error} role="alert">
              {t(`error.${error.code}` as TranslationKey)}
            </p>
          )}

          <Button type="submit" fullWidth isLoading={status === 'loading'}>
            {t('auth.signIn')}
          </Button>

          <div className={styles.social}>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => void dispatch(socialLogin('google'))}
            >
              Google
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => void dispatch(socialLogin('linkedin'))}
            >
              LinkedIn
            </Button>
          </div>

          <p className={styles.hint}>
            Mock auth: any valid email and an 8+ character password signs in. Use the password
            <code> wrongpass </code>
            to see the failure state.
          </p>
        </form>
      </Card>
    </div>
  );
};
