import { PagePlaceholder } from '@/components/layout/PagePlaceholder';

/** The 404 target. Every other placeholder now has a real page behind it. */

export const NotFoundPage = (): React.JSX.Element => (
  <PagePlaceholder
    phase="404"
    title="Page not found"
    body="That route does not exist. Check the address, or head back to the dashboard."
  />
);
