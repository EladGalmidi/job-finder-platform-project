import { PagePlaceholder } from '@/components/layout/PagePlaceholder';

/**
 * Temporary route targets. Each is replaced by its real page in the phase named
 * below; they exist so routing, guards and layout can be verified now.
 */

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
