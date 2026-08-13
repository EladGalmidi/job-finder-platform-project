import { useState } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/Button/Button';
import {
  onboardingPreferencesDrafted,
  savePreferences,
  selectOnboarding,
} from '@/features/auth/authSlice';
import { PreferencesFields } from '@/features/preferences/PreferencesFields';
import { DEFAULT_PREFERENCES, usePreferencesForm } from '@/features/preferences/preferencesForm';
import { toastPushed } from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';

import { useOnboardingSteps } from '../useOnboardingSteps';
import styles from '../Onboarding.module.css';

export const PreferencesStep = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { goTo } = useOnboardingSteps();
  const onboarding = useAppSelector(selectOnboarding);

  // Restores a draft when the user comes back to this step or reloads.
  const form = usePreferencesForm(onboarding.draftPreferences ?? DEFAULT_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);

  const onContinue = (): void => {
    if (!form.validate()) return;

    setIsSaving(true);
    dispatch(onboardingPreferencesDrafted(form.values));

    void dispatch(savePreferences(form.values)).then((result) => {
      setIsSaving(false);
      if (savePreferences.fulfilled.match(result)) {
        goTo('cv');
        return;
      }
      dispatch(
        toastPushed({ severity: 'danger', title: t('state.errorTitle'), message: t('error.UNKNOWN') }),
      );
    });
  };

  return (
    <section className={styles.card}>
      <h1 className={styles.stepTitle}>{t('onboarding.preferences.title')}</h1>
      <p className={styles.stepSubtitle}>{t('onboarding.preferences.subtitle')}</p>

      <div className={styles.fields}>
        <PreferencesFields form={form} idPrefix="onboarding" />
      </div>

      <div className={styles.actions}>
        <Button variant="ghost" onClick={() => goTo('welcome')}>
          {t('common.back')}
        </Button>
        <Button size="lg" onClick={onContinue} isLoading={isSaving}>
          {t('common.continue')}
        </Button>
      </div>
    </section>
  );
};
