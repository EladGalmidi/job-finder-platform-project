import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';

import { Button } from '@/components/ui/Button/Button';
import { EmptyState } from '@/components/ui/EmptyState/EmptyState';
import { createLogger } from '@/lib/logger';

const log = createLogger('router');

/** Route-level failure boundary; ErrorBoundary catches anything outside routing. */
export const RouteError = (): React.JSX.Element => {
  const error = useRouteError();
  const navigate = useNavigate();

  const status = isRouteErrorResponse(error) ? error.status : 500;
  log.error('route failed', { status });

  return (
    <EmptyState
      tone="danger"
      icon="!"
      title={status === 404 ? 'Page not found' : 'Something went wrong'}
      body={
        status === 404
          ? 'That route does not exist.'
          : 'The page failed to load. Going back usually helps.'
      }
      action={
        <Button
          variant="secondary"
          onClick={() => {
            navigate('/');
          }}
        >
          Back to start
        </Button>
      }
    />
  );
};
