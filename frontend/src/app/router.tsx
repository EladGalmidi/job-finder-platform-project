import type { ComponentType } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';

import { OnboardingGuard, ProtectedRoute, PublicOnlyRoute } from './guards/RouteGuards';
import { RouteError } from './routes/RouteError';

type PlaceholderModule = typeof import('./routes/placeholderPages');

/**
 * Route-level code splitting via the `lazy` property. Each page is fetched on
 * first visit rather than bundled into the initial payload.
 *
 * The key is typed against the module, so a renamed or misspelled page is a
 * compile error rather than a blank route at runtime. The return type is written
 * structurally rather than as `LazyRouteFunction<RouteObject>` because that
 * generic does not satisfy its own constraint under exactOptionalPropertyTypes.
 */
type PageLoader = () => Promise<{ Component: ComponentType }>;

const page =
  (name: keyof PlaceholderModule): PageLoader =>
  async () => {
    const module = await import('./routes/placeholderPages');
    return { Component: module[name] };
  };

const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '/dev/ui',
        lazy: async () => {
          const { DevUiPage } = await import('@/features/dev/DevUiPage');
          return { Component: DevUiPage };
        },
      },
    ]
  : [];

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, lazy: page('LandingPage') },
      {
        element: <PublicOnlyRoute />,
        children: [
          {
            path: 'login',
            lazy: async () => {
              const { LoginPage } = await import('@/features/auth/pages/LoginPage');
              return { Component: LoginPage };
            },
          },
          { path: 'signup', lazy: page('SignupPage') },
        ],
      },
    ],
  },

  {
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      // Onboarding renders without app chrome; a user mid-onboarding has no
      // dashboard to navigate to yet.
      {
        element: <OnboardingGuard expectComplete={false} />,
        children: [{ path: '/onboarding/*', lazy: page('OnboardingPage') }],
      },
      {
        element: <OnboardingGuard expectComplete />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/dashboard', lazy: page('DashboardPage') },
              { path: '/jobs', lazy: page('JobsPage') },
              { path: '/jobs/:jobId', lazy: page('JobsPage') },
              { path: '/cv', lazy: page('CvPage') },
              { path: '/applications', lazy: page('ApplicationsPage') },
              { path: '/applications/:applicationId', lazy: page('ApplicationsPage') },
              { path: '/market', lazy: page('MarketPage') },
              { path: '/settings', lazy: page('SettingsPage') },
            ],
          },
        ],
      },
    ],
  },

  ...devRoutes,

  {
    path: '*',
    element: <PublicLayout />,
    children: [{ index: true, lazy: page('NotFoundPage') }],
  },
]);
