import type { ComponentType } from 'react';
import { Navigate, createBrowserRouter, type RouteObject } from 'react-router-dom';

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
        path: 'dev/ui',
        lazy: async () => {
          const { DevUiPage } = await import('@/features/dev/DevUiPage');
          return { Component: DevUiPage };
        },
      },
    ]
  : [];

/**
 * One root route with relative children.
 *
 * A flat list of sibling top-level routes puts `path: '/'` and the `path: '*'`
 * catch-all in the same ranking pool, where the splat can win and swallow the
 * landing page. Nesting everything under a single root makes the index route
 * unambiguous and keeps the 404 scoped to genuinely unmatched paths.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <RouteError />,
    children: [
      // The landing page carries its own nav and footer so its sections can run
      // full-bleed, unlike the constrained column the auth pages want.
      {
        index: true,
        lazy: async () => {
          const { LandingPage } = await import('@/features/landing/LandingPage');
          return { Component: LandingPage };
        },
      },

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
          {
            path: 'signup',
            lazy: async () => {
              const { SignupPage } = await import('@/features/auth/pages/SignupPage');
              return { Component: SignupPage };
            },
          },
        ],
      },

      {
        element: <ProtectedRoute />,
        children: [
          // Onboarding renders without app chrome; a user mid-onboarding has no
          // dashboard to navigate to yet.
          {
            element: <OnboardingGuard expectComplete={false} />,
            children: [
              {
                path: 'onboarding',
                lazy: async () => {
                  const { OnboardingLayout } = await import(
                    '@/features/onboarding/OnboardingLayout'
                  );
                  return { Component: OnboardingLayout };
                },
                children: [
                  { index: true, element: <Navigate to="/onboarding/welcome" replace /> },
                  {
                    path: 'welcome',
                    lazy: async () => {
                      const { WelcomeStep } = await import(
                        '@/features/onboarding/steps/WelcomeStep'
                      );
                      return { Component: WelcomeStep };
                    },
                  },
                  {
                    path: 'preferences',
                    lazy: async () => {
                      const { PreferencesStep } = await import(
                        '@/features/onboarding/steps/PreferencesStep'
                      );
                      return { Component: PreferencesStep };
                    },
                  },
                  {
                    path: 'cv',
                    lazy: async () => {
                      const { CvUploadStep } = await import(
                        '@/features/onboarding/steps/CvUploadStep'
                      );
                      return { Component: CvUploadStep };
                    },
                  },
                  {
                    path: 'analyzing',
                    lazy: async () => {
                      const { AnalyzingStep } = await import(
                        '@/features/onboarding/steps/AnalyzingStep'
                      );
                      return { Component: AnalyzingStep };
                    },
                  },
                  {
                    path: 'results',
                    lazy: async () => {
                      const { ResultsStep } = await import(
                        '@/features/onboarding/steps/ResultsStep'
                      );
                      return { Component: ResultsStep };
                    },
                  },
                ],
              },
            ],
          },

          {
            element: <OnboardingGuard expectComplete />,
            children: [
              {
                element: <AppLayout />,
                children: [
                  { path: 'dashboard', lazy: page('DashboardPage') },
                  { path: 'jobs', lazy: page('JobsPage') },
                  { path: 'jobs/:jobId', lazy: page('JobsPage') },
                  { path: 'cv', lazy: page('CvPage') },
                  { path: 'applications', lazy: page('ApplicationsPage') },
                  { path: 'applications/:applicationId', lazy: page('ApplicationsPage') },
                  { path: 'market', lazy: page('MarketPage') },
                  { path: 'settings', lazy: page('SettingsPage') },
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
    ],
  },
]);
