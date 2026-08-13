import { RouterProvider } from 'react-router-dom';

import { EmptyState } from '@/components/ui/EmptyState/EmptyState';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';

import { AuthBootstrap } from './providers/AuthBootstrap';
import { DocumentSettings } from './providers/DocumentSettings';
import { router } from './router';

export const App = (): React.JSX.Element => (
  <ErrorBoundary
    fallback={
      <EmptyState
        tone="danger"
        icon="!"
        title="The application could not start"
        body="Reload the page. If this keeps happening, clear site data and try again."
      />
    }
  >
    <DocumentSettings />
    <AuthBootstrap>
      <RouterProvider router={router} />
    </AuthBootstrap>
  </ErrorBoundary>
);
