import { useEffect, useState, type FormEvent } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/Button/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog/ConfirmDialog';
import { Input } from '@/components/ui/Input/Input';
import { OptionCard } from '@/components/ui/OptionCard/OptionCard';
import { RadioCardGroup } from '@/components/ui/OptionCard/RadioCardGroup';
import { logout, savePreferences, saveProfile, selectCurrentUser } from '@/features/auth/authSlice';
import { PreferencesFields } from '@/features/preferences/PreferencesFields';
import { DEFAULT_PREFERENCES, usePreferencesForm } from '@/features/preferences/preferencesForm';
import { localeSet, selectLocale, selectTheme, themeSet, toastPushed } from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';
import { isValidFullName } from '@/lib/validation';
import type { Locale, Theme } from '@/types';

import styles from './Settings.module.css';

export const SettingsPage = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const user = useAppSelector(selectCurrentUser);
  const theme = useAppSelector(selectTheme);
  const locale = useAppSelector(selectLocale);

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [headline, setHeadline] = useState(user?.headline ?? '');
  const [showNameError, setShowNameError] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const form = usePreferencesForm(user?.preferences ?? DEFAULT_PREFERENCES);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  // The user arrives from a route transition, so `user` can still be null on
  // the first render while auth rehydrates. Seed the fields once it lands.
  const { reset } = form;
  useEffect(() => {
    if (user === null) return;
    setFullName(user.fullName);
    setHeadline(user.headline ?? '');
    if (user.preferences !== null) reset(user.preferences);
  }, [user, reset]);

  const nameError = showNameError && !isValidFullName(fullName.trim());

  const onSaveProfile = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setShowNameError(true);
    if (!isValidFullName(fullName.trim())) return;

    setIsSavingProfile(true);
    void dispatch(saveProfile({ fullName: fullName.trim(), headline: headline.trim() })).then(
      (result) => {
        setIsSavingProfile(false);
        if (saveProfile.fulfilled.match(result)) {
          dispatch(toastPushed({ severity: 'success', title: t('settings.profileSaved') }));
          return;
        }
        dispatch(toastPushed({ severity: 'danger', title: t('state.errorTitle') }));
      },
    );
  };

  const onSavePreferences = (): void => {
    if (!form.validate()) return;

    setIsSavingPreferences(true);
    void dispatch(savePreferences(form.values)).then((result) => {
      setIsSavingPreferences(false);
      if (savePreferences.fulfilled.match(result)) {
        // Rebaseline so the unsaved-changes notice clears.
        form.reset(form.values);
        dispatch(toastPushed({ severity: 'success', title: t('settings.preferencesSaved') }));
        return;
      }
      dispatch(toastPushed({ severity: 'danger', title: t('state.errorTitle') }));
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h2 className={styles.title}>{t('settings.title')}</h2>
        <p className={styles.subtitle}>{t('settings.subtitle')}</p>
      </header>

      <section className={styles.panel} aria-labelledby="settings-profile">
        <h3 id="settings-profile" className={styles.panelTitle}>
          {t('settings.profileTitle')}
        </h3>
        <p className={styles.panelBody}>{t('settings.profileBody')}</p>

        <form className={styles.form} onSubmit={onSaveProfile} noValidate>
          <Input
            label={t('settings.fullName')}
            value={fullName}
            required
            autoComplete="name"
            onChange={(event) => setFullName(event.target.value)}
            {...(nameError ? { error: t('validation.nameTooShort') } : {})}
          />
          <Input
            label={t('settings.headline')}
            value={headline}
            placeholder={t('settings.headlinePlaceholder')}
            hint={t('settings.headlineHint')}
            onChange={(event) => setHeadline(event.target.value)}
          />
          {/* Read-only: the email is the sign-in identity, and changing it needs
              a verification flow this build does not have. Shown rather than
              hidden so the page answers "which account is this?". */}
          <Input
            label={t('settings.email')}
            value={user?.email ?? ''}
            hint={t('settings.emailHint')}
            type="email"
            readOnly
            disabled
          />

          <div className={styles.formActions}>
            <Button type="submit" isLoading={isSavingProfile}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </section>

      <section className={styles.panel} aria-labelledby="settings-preferences">
        <h3 id="settings-preferences" className={styles.panelTitle}>
          {t('settings.preferencesTitle')}
        </h3>
        <p className={styles.panelBody}>{t('settings.preferencesBody')}</p>

        <div className={styles.fields}>
          <PreferencesFields form={form} idPrefix="settings" />
        </div>

        <div className={styles.formActions}>
          <span className={styles.dirtyNote} aria-live="polite">
            {form.isDirty ? t('settings.unsaved') : ''}
          </span>
          <Button onClick={onSavePreferences} isLoading={isSavingPreferences} disabled={!form.isDirty}>
            {t('common.save')}
          </Button>
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="settings-appearance">
        <h3 id="settings-appearance" className={styles.panelTitle}>
          {t('settings.appearanceTitle')}
        </h3>
        <p className={styles.panelBody}>{t('settings.appearanceBody')}</p>

        <div className={styles.fieldGroup}>
          <h4 className={styles.fieldLabel} id="settings-theme">
            {t('settings.theme')}
          </h4>
          <RadioCardGroup labelledBy="settings-theme" className={styles.optionRow}>
            {(['light', 'dark'] as const).map((value: Theme) => (
              <OptionCard
                key={value}
                title={value === 'light' ? t('settings.themeLight') : t('settings.themeDark')}
                glyph={value === 'light' ? '☀' : '☾'}
                selected={theme === value}
                onSelect={() => dispatch(themeSet(value))}
              />
            ))}
          </RadioCardGroup>
        </div>

        <div className={styles.fieldGroup}>
          <h4 className={styles.fieldLabel} id="settings-language">
            {t('settings.language')}
          </h4>
          <RadioCardGroup labelledBy="settings-language" className={styles.optionRow}>
            {(['en', 'he'] as const).map((value: Locale) => (
              <OptionCard
                key={value}
                title={value === 'en' ? 'English' : 'עברית'}
                selected={locale === value}
                onSelect={() => dispatch(localeSet(value))}
              />
            ))}
          </RadioCardGroup>
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="settings-account">
        <h3 id="settings-account" className={styles.panelTitle}>
          {t('settings.accountTitle')}
        </h3>
        <p className={styles.panelBody}>
          {t('settings.accountBody', { email: user?.email ?? '' })}
        </p>

        <div className={styles.formActions}>
          <Button variant="secondary" onClick={() => setConfirmingSignOut(true)}>
            {t('nav.signOut')}
          </Button>
        </div>
      </section>

      <ConfirmDialog
        isOpen={confirmingSignOut}
        title={t('settings.signOutConfirmTitle')}
        body={t('settings.signOutConfirm')}
        confirmLabel={t('nav.signOut')}
        cancelLabel={t('common.cancel')}
        tone="primary"
        onConfirm={() => {
          setConfirmingSignOut(false);
          void dispatch(logout());
        }}
        onCancel={() => setConfirmingSignOut(false)}
      />
    </div>
  );
};
