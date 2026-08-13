import { useEffect, type ReactNode } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { bootstrapAuth, selectAuthStatus } from '@/features/auth/authSlice';
import { useTranslation } from '@/i18n/useTranslation';

import styles from './AuthBootstrap.module.css';

/**
 * Resolves the stored session before any guard renders.
 *
 * Without this gate, a refresh on a protected route would redirect to /login for
 * one frame while the token is still being exchanged for a user.
 */
export const AuthBootstrap = ({ children }: { children: ReactNode }): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectAuthStatus);
  const { t } = useTranslation();

  useEffect(() => {
    if (status === 'idle') {
      void dispatch(bootstrapAuth());
    }
  }, [dispatch, status]);

  if (status === 'idle' || status === 'loading') {
    return (
      <div className={styles.splash}>
        <span className={styles.brand}>{t('app.name')}</span>
        <Spinner size="lg" label={t('common.loading')} />
      </div>
    );
  }

  return <>{children}</>;
};
