import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/Button/Button';
import { Checkbox } from '@/components/ui/Checkbox/Checkbox';
import { Input } from '@/components/ui/Input/Input';
import {
  selectAuthError,
  selectSubmitStatus,
  signup,
  socialLogin,
} from '@/features/auth/authSlice';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/types';
import { isValidEmail, isValidFullName, isValidPassword } from '@/lib/validation';

import { AuthLayout } from '../components/AuthLayout';
import { PasswordField } from '../components/PasswordField';
import { SocialButtons } from '../components/SocialButtons';
import styles from '../Auth.module.css';

interface FieldErrors {
  fullName?: TranslationKey;
  email?: TranslationKey;
  password?: TranslationKey;
  terms?: TranslationKey;
}

interface FormValues {
  fullName: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
}

const validate = ({ fullName, email, password, acceptedTerms }: FormValues): FieldErrors => {
  const errors: FieldErrors = {};

  if (fullName.trim() === '') errors.fullName = 'validation.nameRequired';
  else if (!isValidFullName(fullName)) errors.fullName = 'validation.nameTooShort';

  if (email.trim() === '') errors.email = 'validation.emailRequired';
  else if (!isValidEmail(email)) errors.email = 'validation.emailInvalid';

  if (password === '') errors.password = 'validation.passwordRequired';
  else if (!isValidPassword(password)) errors.password = 'validation.passwordTooShort';

  if (!acceptedTerms) errors.terms = 'validation.termsRequired';

  return errors;
};

/**
 * A new account starts with no preferences and no CV, so completing this form
 * drops the user into onboarding rather than the dashboard — the guard handles
 * the redirect.
 */
export const SignupPage = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectSubmitStatus);
  const serverError = useAppSelector(selectAuthError);
  const { t } = useTranslation();

  const [values, setValues] = useState<FormValues>({
    fullName: '',
    email: '',
    password: '',
    acceptedTerms: false,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<'google' | 'linkedin' | null>(null);

  const isSubmitting = status === 'loading';

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]): void => {
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (touched) setErrors(validate(next));
      return next;
    });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setTouched(true);

    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPendingProvider(null);
    void dispatch(
      signup({ fullName: values.fullName, email: values.email, password: values.password }),
    );
  };

  const onSocial = (provider: 'google' | 'linkedin'): void => {
    setPendingProvider(provider);
    void dispatch(socialLogin(provider));
  };

  const bannerError =
    serverError === null || serverError.code === 'VALIDATION_FAILED' ? null : serverError;

  return (
    <AuthLayout title={t('auth.signupTitle')} subtitle={t('auth.signupSubtitle')}>
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
            label={t('auth.fullName')}
            autoComplete="name"
            placeholder={t('auth.namePlaceholder')}
            value={values.fullName}
            required
            onChange={(event) => update('fullName', event.target.value)}
            onBlur={() => setErrors(validate(values))}
            {...(errors.fullName === undefined ? {} : { error: t(errors.fullName) })}
          />

          <Input
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder')}
            value={values.email}
            required
            onChange={(event) => update('email', event.target.value)}
            onBlur={() => setErrors(validate(values))}
            {...(errors.email === undefined ? {} : { error: t(errors.email) })}
          />

          <PasswordField
            value={values.password}
            onChange={(value) => update('password', value)}
            onBlur={() => setErrors(validate(values))}
            autoComplete="new-password"
            hint={t('auth.passwordHint')}
            showStrength
            required
            {...(errors.password === undefined ? {} : { error: t(errors.password) })}
          />

          <Checkbox
            label={t('auth.terms')}
            checked={values.acceptedTerms}
            onChange={(event) => update('acceptedTerms', event.target.checked)}
            {...(errors.terms === undefined ? {} : { error: t(errors.terms) })}
          />
        </div>

        <div className={styles.submitRow}>
          <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
            {t('auth.signUp')}
          </Button>
        </div>
      </form>

      <p className={styles.switchRow}>
        {t('auth.hasAccount')}{' '}
        <Link to="/login" className={styles.textLink}>
          {t('auth.signIn')}
        </Link>
      </p>

      <p className={styles.demoHint}>{t('auth.demoHint')}</p>
    </AuthLayout>
  );
};
