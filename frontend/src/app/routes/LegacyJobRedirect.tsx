import { Navigate, useParams } from 'react-router-dom';

/**
 * The jobs list moved from /jobs to /dashboard/jobs in Phase 4. This keeps
 * previously shared detail links working by carrying the job id across.
 */
export const LegacyJobRedirect = (): React.JSX.Element => {
  const params = useParams();
  return <Navigate to={`/dashboard/jobs/${params['jobId'] ?? ''}`} replace />;
};
