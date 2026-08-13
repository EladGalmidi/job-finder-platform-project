import { useState } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/Button/Button';
import { Chip } from '@/components/ui/Chip/Chip';
import { OptionCard } from '@/components/ui/OptionCard/OptionCard';
import { RangeSlider } from '@/components/ui/RangeSlider/RangeSlider';
import { Select } from '@/components/ui/Select/Select';
import {
  onboardingPreferencesDrafted,
  savePreferences,
  selectOnboarding,
} from '@/features/auth/authSlice';
import { toastPushed } from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/types';
import {
  JOB_TYPE_LABEL,
  LOCATION_OPTIONS,
  REMOTE_LABEL,
  ROLE_LABEL,
  SENIORITY_LABEL,
} from '@/lib/labels';
import {
  JOB_TYPES,
  REMOTE_MODES,
  ROLE_KEYS,
  SENIORITIES,
  type JobType,
  type RemoteMode,
  type RoleKey,
  type Seniority,
  type UserPreferences,
} from '@/types';

import { useOnboardingSteps } from '../useOnboardingSteps';
import styles from '../Onboarding.module.css';

const SALARY_MIN = 8000;
const SALARY_MAX = 70000;
const SALARY_STEP = 1000;

const DEFAULTS: UserPreferences = {
  desiredRoles: [],
  seniority: 'mid',
  locations: [],
  remoteMode: 'any',
  jobTypes: ['fullTime'],
  salary: { min: 22000, max: 34000, currency: 'ILS', period: 'month' },
  availability: 'oneMonth',
  willingToRelocate: false,
};

const toggle = <T,>(list: readonly T[], value: T): T[] =>
  list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];

interface Errors {
  roles?: TranslationKey;
  locations?: TranslationKey;
  jobTypes?: TranslationKey;
}

const computeErrors = (values: UserPreferences): Errors => {
  const errors: Errors = {};
  if (values.desiredRoles.length === 0) errors.roles = 'validation.rolesRequired';
  if (values.locations.length === 0) errors.locations = 'validation.locationsRequired';
  if (values.jobTypes.length === 0) errors.jobTypes = 'validation.jobTypesRequired';
  return errors;
};

export const PreferencesStep = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { t, locale } = useTranslation();
  const { goTo } = useOnboardingSteps();
  const onboarding = useAppSelector(selectOnboarding);

  // Restores a draft when the user comes back to this step or reloads.
  const [values, setValues] = useState<UserPreferences>(onboarding.draftPreferences ?? DEFAULTS);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Errors are derived, not stored. Storing them left "Pick at least one role"
   * on screen after the user had already picked one, because nothing recomputed
   * until the next submit.
   */
  const [showErrors, setShowErrors] = useState(false);
  const errors = showErrors ? computeErrors(values) : {};

  const patch = (next: Partial<UserPreferences>): void => {
    setValues((current) => ({ ...current, ...next }));
  };

  /**
   * Toggles must derive the next list from the latest state, not from the
   * `values` captured at render. Two selections inside one React batch would
   * otherwise both start from the same array and the second would discard the
   * first.
   */
  const patchWith = (next: (current: UserPreferences) => Partial<UserPreferences>): void => {
    setValues((current) => ({ ...current, ...next(current) }));
  };

  const formatSalary = (value: number): string =>
    new Intl.NumberFormat(locale === 'he' ? 'he-IL' : 'en-IL', {
      style: 'currency',
      currency: 'ILS',
      maximumFractionDigits: 0,
    }).format(value);

  const onContinue = (): void => {
    setShowErrors(true);
    if (Object.keys(computeErrors(values)).length > 0) return;

    setIsSaving(true);
    dispatch(onboardingPreferencesDrafted(values));

    void dispatch(savePreferences(values)).then((result) => {
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

      <div className={styles.fieldGroup}>
        <h2 className={styles.fieldLabel} id="roles-label">
          {t('onboarding.preferences.roles')}
        </h2>
        <p className={styles.fieldHint}>{t('onboarding.preferences.rolesHint')}</p>
        <div className={styles.chipRow} role="group" aria-labelledby="roles-label">
          {ROLE_KEYS.map((role: RoleKey) => (
            <Chip
              key={role}
              label={t(ROLE_LABEL[role])}
              selected={values.desiredRoles.includes(role)}
              onToggle={() =>
                patchWith((current) => ({ desiredRoles: toggle(current.desiredRoles, role) }))
              }
            />
          ))}
        </div>
        {errors.roles === undefined ? null : (
          <p className={styles.fieldError} role="alert">
            {t(errors.roles)}
          </p>
        )}
      </div>

      <div className={styles.fieldGroup}>
        <h2 className={styles.fieldLabel} id="locations-label">
          {t('onboarding.preferences.locations')}
        </h2>
        <p className={styles.fieldHint}>{t('onboarding.preferences.locationsHint')}</p>
        <div className={styles.chipRow} role="group" aria-labelledby="locations-label">
          {LOCATION_OPTIONS.map((location) => (
            <Chip
              key={location}
              label={location}
              selected={values.locations.includes(location)}
              onToggle={() =>
                patchWith((current) => ({ locations: toggle(current.locations, location) }))
              }
            />
          ))}
        </div>
        {errors.locations === undefined ? null : (
          <p className={styles.fieldError} role="alert">
            {t(errors.locations)}
          </p>
        )}
      </div>

      <div className={styles.fieldGroup}>
        <h2 className={styles.fieldLabel} id="jobtypes-label">
          {t('onboarding.preferences.jobTypes')}
        </h2>
        <div className={styles.optionGrid} role="group" aria-labelledby="jobtypes-label">
          {JOB_TYPES.map((jobType: JobType) => (
            <OptionCard
              key={jobType}
              mode="multiple"
              title={t(JOB_TYPE_LABEL[jobType])}
              selected={values.jobTypes.includes(jobType)}
              onSelect={() =>
                patchWith((current) => ({ jobTypes: toggle(current.jobTypes, jobType) }))
              }
            />
          ))}
        </div>
        {errors.jobTypes === undefined ? null : (
          <p className={styles.fieldError} role="alert">
            {t(errors.jobTypes)}
          </p>
        )}
      </div>

      <div className={styles.fieldGroup}>
        <h2 className={styles.fieldLabel} id="workmode-label">
          {t('onboarding.preferences.workMode')}
        </h2>
        <div className={styles.optionGrid} role="radiogroup" aria-labelledby="workmode-label">
          {(['any', ...REMOTE_MODES] as const).map((mode: RemoteMode | 'any') => (
            <OptionCard
              key={mode}
              title={t(REMOTE_LABEL[mode])}
              selected={values.remoteMode === mode}
              onSelect={() => patch({ remoteMode: mode })}
            />
          ))}
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <div className={styles.selectRow}>
          <Select
            label={t('onboarding.preferences.seniority')}
            value={values.seniority}
            options={SENIORITIES.map((level: Seniority) => ({
              value: level,
              label: t(SENIORITY_LABEL[level]),
            }))}
            onChange={(event) => patch({ seniority: event.target.value as Seniority })}
          />
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <h2 className={styles.fieldLabel}>{t('onboarding.preferences.salary')}</h2>
        <RangeSlider
          min={SALARY_MIN}
          max={SALARY_MAX}
          step={SALARY_STEP}
          valueMin={values.salary.min}
          valueMax={values.salary.max}
          minLabel={t('onboarding.preferences.salaryMin')}
          maxLabel={t('onboarding.preferences.salaryMax')}
          formatValue={formatSalary}
          hint={t('onboarding.preferences.salaryHint')}
          onChange={(next) =>
            patchWith((current) => ({
              salary: { ...current.salary, min: next.min, max: next.max },
            }))
          }
        />
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
