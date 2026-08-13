import { useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/Button/Button';
import { selectCurrentUser } from '@/features/auth/authSlice';
import { useTranslation } from '@/i18n/useTranslation';

import { useOnboardingSteps } from '../useOnboardingSteps';
import styles from '../Onboarding.module.css';

export const WelcomeStep = (): React.JSX.Element => {
  const user = useAppSelector(selectCurrentUser);
  const { t } = useTranslation();
  const { goTo } = useOnboardingSteps();

  const firstName = (user?.fullName ?? '').split(' ')[0] ?? '';

  const points = [
    { title: t('onboarding.welcome.point1.title'), body: t('onboarding.welcome.point1.body') },
    { title: t('onboarding.welcome.point2.title'), body: t('onboarding.welcome.point2.body') },
    { title: t('onboarding.welcome.point3.title'), body: t('onboarding.welcome.point3.body') },
  ];

  return (
    <section className={styles.card}>
      <h1 className={styles.stepTitle}>{t('onboarding.welcome.title', { name: firstName })}</h1>
      <p className={styles.stepSubtitle}>{t('onboarding.welcome.subtitle')}</p>

      <ol className={styles.welcomeList}>
        {points.map((point, index) => (
          <li key={point.title} className={styles.welcomeItem}>
            <span className={styles.welcomeNumber} aria-hidden="true">
              {index + 1}
            </span>
            <div>
              <h2 className={styles.welcomeItemTitle}>{point.title}</h2>
              <p className={styles.welcomeItemBody}>{point.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className={styles.actions}>
        <span />
        <Button size="lg" onClick={() => goTo('preferences')}>
          {t('onboarding.welcome.cta')}
        </Button>
      </div>
    </section>
  );
};
