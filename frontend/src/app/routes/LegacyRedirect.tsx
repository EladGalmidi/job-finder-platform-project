import { Navigate, useLocation, useParams } from 'react-router-dom';

export interface LegacyRedirectProps {
  /** Target path. `:jobId` is substituted from the matched route params. */
  readonly to: string;
}

/**
 * Redirects a pre-Phase-4 path to its `/dashboard` equivalent.
 *
 * `<Navigate to="/dashboard/jobs" />` drops the query string, so a shared link
 * like `/jobs?tab=fullMatch&roles=frontend` used to land on an unfiltered list.
 * Search and hash are carried across, and `:jobId` is substituted so detail
 * links keep working too.
 */
export const LegacyRedirect = ({ to }: LegacyRedirectProps): React.JSX.Element => {
  const params = useParams();
  const { search, hash } = useLocation();

  const target = to.replace(':jobId', params['jobId'] ?? '');

  return <Navigate to={`${target}${search}${hash}`} replace />;
};
