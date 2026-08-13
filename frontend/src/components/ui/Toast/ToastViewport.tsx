import { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectToasts, toastDismissed } from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';
import { cx } from '@/lib/cx';

import styles from './ToastViewport.module.css';

interface ToastItemProps {
  readonly id: string;
  readonly severity: 'info' | 'success' | 'warning' | 'danger';
  readonly title: string;
  readonly message: string | undefined;
  readonly durationMs: number;
}

const ToastItem = ({
  id,
  severity,
  title,
  message,
  durationMs,
}: ToastItemProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(toastDismissed(id));
    }, durationMs);
    return () => {
      clearTimeout(timer);
    };
  }, [dispatch, id, durationMs]);

  return (
    <div
      className={cx(styles.toast, styles[severity])}
      // Errors interrupt; everything else waits for a pause in speech.
      role={severity === 'danger' ? 'alert' : 'status'}
    >
      <div className={styles.content}>
        <p className={styles.title}>{title}</p>
        {message === undefined ? null : <p className={styles.message}>{message}</p>}
      </div>
      <button
        type="button"
        className={styles.dismiss}
        onClick={() => dispatch(toastDismissed(id))}
        aria-label={t('common.dismiss')}
      >
        ✕
      </button>
    </div>
  );
};

export const ToastViewport = (): React.JSX.Element | null => {
  const toasts = useAppSelector(selectToasts);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.viewport}>
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          severity={toast.severity}
          title={toast.title}
          message={toast.message}
          durationMs={toast.durationMs}
        />
      ))}
    </div>
  );
};
