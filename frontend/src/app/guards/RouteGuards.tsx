import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAppSelector } from '@/app/hooks';
import {
  selectHasCompletedOnboarding,
  selectIsAuthenticated,
} from '@/features/auth/authSlice';

/**
 * Guards assume the session is already resolved — AuthBootstrap renders a splash
 * until then, so `isAuthenticated` here is never a premature `false`.
 */

export const ProtectedRoute = (): React.JSX.Element => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    // Preserve the attempted destination so login can return the user to it.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
};

export const PublicOnlyRoute = (): React.JSX.Element => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const hasOnboarded = useAppSelector(selectHasCompletedOnboarding);

  if (isAuthenticated) {
    return <Navigate to={hasOnboarded ? '/dashboard' : '/onboarding'} replace />;
  }

  return <Outlet />;
};

/** Keeps onboarded users out of /onboarding and unonboarded users inside it. */
export const OnboardingGuard = ({ expectComplete }: { expectComplete: boolean }): React.JSX.Element => {
  const hasOnboarded = useAppSelector(selectHasCompletedOnboarding);

  if (expectComplete && !hasOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!expectComplete && hasOnboarded) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
