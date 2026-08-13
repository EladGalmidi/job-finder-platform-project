import type { ReactNode } from 'react';

import { EmptyState } from '@/components/ui/EmptyState/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState/ErrorState';
import { useTranslation } from '@/i18n/useTranslation';
import type { RequestStatus, SerializedApiError } from '@/types';

export interface QueryBoundaryProps {
  readonly status: RequestStatus;
  readonly error?: SerializedApiError | null;
  readonly isEmpty?: boolean;
  readonly skeleton: ReactNode;
  readonly empty?: ReactNode;
  readonly onRetry?: () => void;
  readonly children: ReactNode;
}

/**
 * The loading / error / empty / content decision, written once.
 *
 * Every data-backed surface routes through this so the four states cannot be
 * partially implemented, which is the usual way empty states get forgotten.
 */
export const QueryBoundary = ({
  status,
  error = null,
  isEmpty = false,
  skeleton,
  empty,
  onRetry,
  children,
}: QueryBoundaryProps): React.JSX.Element => {
  const { t } = useTranslation();

  if (status === 'idle' || status === 'loading') {
    return (
      <div aria-busy="true" aria-live="polite">
        {skeleton}
      </div>
    );
  }

  if (status === 'failed') {
    return <ErrorState error={error} {...(onRetry === undefined ? {} : { onRetry })} />;
  }

  if (isEmpty) {
    return <>{empty ?? <EmptyState title={t('state.emptyTitle')} body={t('state.emptyBody')} />}</>;
  }

  return <>{children}</>;
};
