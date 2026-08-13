import { PagePlaceholder } from '@/components/layout/PagePlaceholder';

/**
 * Temporary route targets. Each is replaced by its real page in the phase named
 * below; they exist so routing, guards and layout can be verified now.
 */

export const LandingPage = (): React.JSX.Element => (
  <PagePlaceholder
    phase="Phase 4"
    title="Landing"
    body="The marketing page — hero, how it works, features, CV analysis preview, job matching preview, CTA and footer — is built in the landing phase."
  />
);

export const SignupPage = (): React.JSX.Element => (
  <PagePlaceholder
    phase="Phase 3"
    title="Sign up"
    body="The full sign-up experience is built in the auth phase. The login page already exercises the auth thunks, guards and error states."
  />
);

export const OnboardingPage = (): React.JSX.Element => (
  <PagePlaceholder
    phase="Phase 5"
    title="Onboarding"
    body="Welcome, preferences, CV upload, analysing and results. The polled analysis endpoint and the onboarding slice state are already in place."
  />
);

export const DashboardPage = (): React.JSX.Element => (
  <PagePlaceholder
    phase="Phase 10"
    title="Dashboard"
    body="Built last, because it aggregates every other feature. Metrics, matches, CV score, alerts and activity all have working endpoints already."
  />
);

export const JobsPage = (): React.JSX.Element => (
  <PagePlaceholder
    phase="Phase 6"
    title="Jobs"
    body="Search, filters, sorting, tabs and the route-backed job detail drawer. The jobs endpoint already does real filtering, sorting and pagination."
  />
);

export const CvPage = (): React.JSX.Element => (
  <PagePlaceholder
    phase="Phase 8"
    title="CV analysis"
    body="Score, breakdown, missing skills, recommendations and market demand. The analysis model and endpoints are complete."
  />
);

export const ApplicationsPage = (): React.JSX.Element => (
  <PagePlaceholder
    phase="Phase 7"
    title="Applications"
    body="Saved, applied, interview, offer and rejected, with notes and a status timeline. Status transitions already write activity entries."
  />
);

export const MarketPage = (): React.JSX.Element => (
  <PagePlaceholder
    phase="Phase 9"
    title="Market analysis"
    body="Top skills, demand, salary ranges and sources for DevOps, Backend, Frontend and Product Manager. All four snapshots are seeded."
  />
);

export const SettingsPage = (): React.JSX.Element => (
  <PagePlaceholder
    phase="Phase 11"
    title="Settings"
    body="Profile, job preferences, appearance and notifications. Added to the plan so preferences captured during onboarding remain editable."
  />
);

export const NotFoundPage = (): React.JSX.Element => (
  <PagePlaceholder
    phase="404"
    title="Page not found"
    body="That route does not exist. Check the address, or head back to the dashboard."
  />
);
