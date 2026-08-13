import { Chip } from '@/components/ui/Chip/Chip';
import { OptionCard } from '@/components/ui/OptionCard/OptionCard';
import { RadioCardGroup } from '@/components/ui/OptionCard/RadioCardGroup';
import { RangeSlider } from '@/components/ui/RangeSlider/RangeSlider';
import { Select } from '@/components/ui/Select/Select';
import { useTranslation } from '@/i18n/useTranslation';
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
} from '@/types';

import { SALARY_MAX, SALARY_MIN, SALARY_STEP, toggle, type PreferencesForm } from './preferencesForm';
import styles from './PreferencesFields.module.css';

export interface PreferencesFieldsProps {
  readonly form: PreferencesForm;
  /**
   * Distinguishes the two instances' element ids. Onboarding and settings never
   * render at once today, but duplicate ids would break `aria-labelledby`
   * silently if they ever did.
   */
  readonly idPrefix: string;
}

/**
 * The six job-preference fields, rendered identically wherever they appear.
 *
 * Onboarding collects these and settings edits them; they were one screen's
 * markup before, which made "you can change any of it later in settings" a
 * promise nothing kept.
 */
export const PreferencesFields = ({
  form,
  idPrefix,
}: PreferencesFieldsProps): React.JSX.Element => {
  const { t, locale } = useTranslation();
  const { values, errors, patch, patchWith } = form;

  const id = (name: string): string => `${idPrefix}-${name}`;

  const formatSalary = (value: number): string =>
    new Intl.NumberFormat(locale === 'he' ? 'he-IL' : 'en-IL', {
      style: 'currency',
      currency: 'ILS',
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <>
      <div className={styles.fieldGroup}>
        <h3 className={styles.fieldLabel} id={id('roles')}>
          {t('onboarding.preferences.roles')}
        </h3>
        <p className={styles.fieldHint}>{t('onboarding.preferences.rolesHint')}</p>
        <div className={styles.chipRow} role="group" aria-labelledby={id('roles')}>
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
        <h3 className={styles.fieldLabel} id={id('locations')}>
          {t('onboarding.preferences.locations')}
        </h3>
        <p className={styles.fieldHint}>{t('onboarding.preferences.locationsHint')}</p>
        <div className={styles.chipRow} role="group" aria-labelledby={id('locations')}>
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
        <h3 className={styles.fieldLabel} id={id('jobtypes')}>
          {t('onboarding.preferences.jobTypes')}
        </h3>
        <div className={styles.optionGrid} role="group" aria-labelledby={id('jobtypes')}>
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
        <h3 className={styles.fieldLabel} id={id('workmode')}>
          {t('onboarding.preferences.workMode')}
        </h3>
        <RadioCardGroup labelledBy={id('workmode')} className={styles.optionGrid}>
          {(['any', ...REMOTE_MODES] as const).map((mode: RemoteMode | 'any') => (
            <OptionCard
              key={mode}
              title={t(REMOTE_LABEL[mode])}
              selected={values.remoteMode === mode}
              onSelect={() => patch({ remoteMode: mode })}
            />
          ))}
        </RadioCardGroup>
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
        <h3 className={styles.fieldLabel}>{t('onboarding.preferences.salary')}</h3>
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
    </>
  );
};
