import { Button } from '../Button/Button';
import { EmptyState } from '../EmptyState/EmptyState';

import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/types';
import type { SerializedApiError } from '@/types';

export interface ErrorStateProps {
  readonly error: SerializedApiError | null;
  readonly onRetry?: () => void;
}

/**
 * Maps a structured error code onto copy. Nothing here parses `message` —
 * the code is the contract, the message is only a fallback for UNKNOWN.
 */
export const ErrorState = ({ error, onRetry }: ErrorStateProps): React.JSX.Element => {
  const { t } = useTranslation();

  const key: TranslationKey =
    error === null ? 'error.UNKNOWN' : (`error.${error.code}` as TranslationKey);

  return (
    <EmptyState
      tone="danger"
      icon="!"
      title={t('state.errorTitle')}
      body={t(key)}
      action={
        onRetry === undefined ? undefined : (
          <Button variant="secondary" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        )
      }
    />
  );
};
