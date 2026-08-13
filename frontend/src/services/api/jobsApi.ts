import type { JobDetailResponse, JobId, JobListItem, JobQuery, Paginated } from '@/types';

import { api } from '../http/client';

/** Serialises a JobQuery into the query string the backend contract expects. */
export const toJobParams = (query: JobQuery): Record<string, string | number> => {
  const params: Record<string, string | number> = {
    sort: query.sort,
    tab: query.tab,
    page: query.page,
  };

  if (query.q !== '') params['q'] = query.q;
  if (query.roles.length > 0) params['roles'] = query.roles.join(',');
  if (query.locations.length > 0) params['locations'] = query.locations.join(',');
  if (query.remoteModes.length > 0) params['remoteModes'] = query.remoteModes.join(',');
  if (query.jobTypes.length > 0) params['jobTypes'] = query.jobTypes.join(',');
  if (query.seniorities.length > 0) params['seniorities'] = query.seniorities.join(',');
  if (query.salaryMin !== null) params['salaryMin'] = query.salaryMin;

  return params;
};

export const jobsApi = {
  list: (query: JobQuery, signal?: AbortSignal): Promise<Paginated<JobListItem>> =>
    api.get<Paginated<JobListItem>>('/jobs', {
      params: toJobParams(query),
      ...(signal === undefined ? {} : { signal }),
    }),

  detail: (jobId: JobId, signal?: AbortSignal): Promise<JobDetailResponse> =>
    api.get<JobDetailResponse>(`/jobs/${jobId}`, signal === undefined ? undefined : { signal }),
};
