import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { login, selectAuthError, selectSubmitStatus, socialLogin } from '@/features/auth/authSlice';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/types';
import { isValidEmail } from '@/lib/validation';

import { AuthLayout } from '../components/AuthLayout';
import { PasswordField } from '../components/PasswordField';
import { SocialButtons } from '../components/SocialButtons';
import styles from '../Auth.module.css';

interface FieldErrors {
  email?: TranslationKey;
  password?: TranslationKey;
}

const validate = (email: string, password: string): FieldErrors => {
  const errors: FieldErrors = {};
  if (email.trim() === '') errors.email = 'validation.emailRequired';
  else if (!isValidEmail(email)) errors.email = 'validation.emailInvalid';
  if (password === '') errors.password = 'validation.passwordRequired';
  return errors;
};

export const LoginPage = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectSubmitStatus);
  const serverError = useAppSelector(selectAuthError);
  const { t } = useTranslation();

  const [email, setEmail] = useState('demo@jobmatch.ai');
  const [password, setPassword] = useState('demo1234');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<'google' | 'linkedin' | null>(null);

  const isSubmitting = status === 'loading';

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setTouched(true);

    const nextErrors = validate(email, password);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPendingProvider(null);
    void dispatch(login({ email, password }));
  };

  const revalidate = (): void => {
    if (touched) setErrors(validate(email, password));
  };

  const onSocial = (provider: 'google' | 'linkedin'): void => {
    setPendingProvider(provider);
    void dispatch(socialLogin(provider));
  };

  // Field-level problems are rendered inline; only whole-form failures such as
  // bad credentials or a server error surface in the banner.
  const bannerError =
    serverError === null || serverError.code === 'VALIDATION_FAILED' ? null : serverError;

  return (
    <AuthLayout title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
      <SocialButtons
        onSelect={onSocial}
        pendingProvider={pendingProvider}
        disabled={isSubmitting}
      />

      <div className={styles.divider}>{t('common.or')}</div>

      {bannerError === null ? null : (
        <div className={styles.formError} role="alert">
          <span aria-hidden="true">⚠</span>
          <span>{t(`error.${bannerError.code}` as TranslationKey)}</span>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <div className={styles.fields}>
          <Input
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            required
            onChange={(event) => setEmail(event.target.value)}
            onBlur={revalidate}
            {...(errors.email === undefined ? {} : { error: t(errors.email) })}
          />

          <PasswordField
            value={password}
            onChange={setPassword}
            onBlur={revalidate}
            required
            {...(errors.password === undefined ? {} : { error: t(errors.password) })}
          />
        </div>

        <div className={styles.metaRow}>
          <span />
          <Link to="/signup" className={styles.textLink}>
            {t('auth.forgotPassword')}
          </Link>
        </div>

        <div className={styles.submitRow}>
          <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
            {t('auth.signIn')}
          </Button>
        </div>
      </form>

      <p className={styles.switchRow}>
        {t('auth.noAccount')}{' '}
        <Link to="/signup" className={styles.textLink}>
          {t('auth.signUp')}
        </Link>
      </p>

      <p className={styles.demoHint}>
        {t('auth.demoHint')} {t('auth.demoHintFail')}
      </p>
    </AuthLayout>
  );
};
