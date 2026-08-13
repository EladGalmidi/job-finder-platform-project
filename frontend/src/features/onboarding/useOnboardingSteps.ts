import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch } from '@/app/hooks';
import { ONBOARDING_STEPS, onboardingStepSet, type OnboardingStep } from '@/features/auth/authSlice';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/types';

const STEP_LABEL: Record<OnboardingStep, TranslationKey> = {
  welcome: 'onboarding.step.welcome',
  preferences: 'onboarding.step.preferences',
  cv: 'onboarding.step.cv',
  analyzing: 'onboarding.step.analyzing',
  results: 'onboarding.step.results',
};

export const stepPath = (step: OnboardingStep): string => `/onboarding/${step}`;

export interface OnboardingNav {
  readonly steps: readonly { id: string; label: string }[];
  readonly indexOf: (step: OnboardingStep) => number;
  readonly goTo: (step: OnboardingStep) => void;
}

/**
 * Keeps the route and the persisted step in sync.
 *
 * Navigation always goes through `goTo`, so the stored progress can never
 * disagree with the URL the user is looking at.
 */
export const useOnboardingSteps = (): OnboardingNav => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const steps = ONBOARDING_STEPS.map((step) => ({ id: step, label: t(STEP_LABEL[step]) }));

  const indexOf = useCallback(
    (step: OnboardingStep) => ONBOARDING_STEPS.indexOf(step),
    [],
  );

  const goTo = useCallback(
    (step: OnboardingStep) => {
      dispatch(onboardingStepSet(step));
      navigate(stepPath(step));
    },
    [dispatch, navigate],
  );

  return { steps, indexOf, goTo };
};
