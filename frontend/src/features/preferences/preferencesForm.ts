import { useCallback, useMemo, useState } from 'react';

import type { TranslationKey } from '@/i18n/types';
import type { UserPreferences } from '@/types';

export const SALARY_MIN = 8000;
export const SALARY_MAX = 70000;
export const SALARY_STEP = 1000;

export const DEFAULT_PREFERENCES: UserPreferences = {
  desiredRoles: [],
  seniority: 'mid',
  locations: [],
  remoteMode: 'any',
  jobTypes: ['fullTime'],
  salary: { min: 22000, max: 34000, currency: 'ILS', period: 'month' },
};

export const toggle = <T,>(list: readonly T[], value: T): T[] =>
  list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];

export interface PreferencesErrors {
  roles?: TranslationKey;
  locations?: TranslationKey;
  jobTypes?: TranslationKey;
}

const computeErrors = (values: UserPreferences): PreferencesErrors => {
  const errors: PreferencesErrors = {};
  if (values.desiredRoles.length === 0) errors.roles = 'validation.rolesRequired';
  if (values.locations.length === 0) errors.locations = 'validation.locationsRequired';
  if (values.jobTypes.length === 0) errors.jobTypes = 'validation.jobTypesRequired';
  return errors;
};

export interface PreferencesForm {
  readonly values: UserPreferences;
  readonly errors: PreferencesErrors;
  readonly patch: (next: Partial<UserPreferences>) => void;
  /** Derives the next value from the latest state rather than the render's. */
  readonly patchWith: (next: (current: UserPreferences) => Partial<UserPreferences>) => void;
  readonly reset: (next: UserPreferences) => void;
  /** Reveals errors and reports whether the values are valid. */
  readonly validate: () => boolean;
  readonly isDirty: boolean;
}

/**
 * The preferences form state, shared by onboarding and settings.
 *
 * Both screens edit the same six fields against the same endpoint. Keeping one
 * hook and one field set means a change to validation or to the shape of a
 * preference cannot land in one place and be forgotten in the other.
 */
export const usePreferencesForm = (initial: UserPreferences): PreferencesForm => {
  const [values, setValues] = useState<UserPreferences>(initial);
  const [baseline, setBaseline] = useState<UserPreferences>(initial);

  /**
   * Errors are derived, not stored. Storing them left "Pick at least one role"
   * on screen after the user had already picked one, because nothing recomputed
   * until the next submit.
   */
  const [showErrors, setShowErrors] = useState(false);

  const patch = useCallback((next: Partial<UserPreferences>) => {
    setValues((current) => ({ ...current, ...next }));
  }, []);

  const patchWith = useCallback(
    (next: (current: UserPreferences) => Partial<UserPreferences>) => {
      setValues((current) => ({ ...current, ...next(current) }));
    },
    [],
  );

  /**
   * Stable across renders on purpose. Callers seed the form from a user record
   * inside an effect; an identity that changed every render made that effect
   * re-run continuously and overwrite whatever the user had just edited.
   */
  const reset = useCallback((next: UserPreferences) => {
    setValues(next);
    setBaseline(next);
    setShowErrors(false);
  }, []);

  const validate = useCallback(() => {
    setShowErrors(true);
    return Object.keys(computeErrors(values)).length === 0;
  }, [values]);

  return useMemo(
    () => ({
      values,
      errors: showErrors ? computeErrors(values) : {},
      patch,
      patchWith,
      reset,
      validate,
      isDirty: JSON.stringify(values) !== JSON.stringify(baseline),
    }),
    [values, showErrors, baseline, patch, patchWith, reset, validate],
  );
};
