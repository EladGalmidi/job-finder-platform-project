import type {
  Application,
  ApplicationId,
  ApplicationListItem,
  ApplicationQuery,
  ApplicationStatus,
  JobId,
} from '@/types';

import { api } from '../http/client';

export const applicationsApi = {
  list: (query: ApplicationQuery, signal?: AbortSignal): Promise<readonly ApplicationListItem[]> =>
    api.get<readonly ApplicationListItem[]>('/applications', {
      params: {
        ...(query.q === '' ? {} : { q: query.q }),
        ...(query.statuses.length === 0 ? {} : { statuses: query.statuses.join(',') }),
        sort: query.sort,
      },
      ...(signal === undefined ? {} : { signal }),
    }),

  create: (jobId: JobId, status: Extract<ApplicationStatus, 'saved' | 'applied'>): Promise<Application> =>
    api.post<Application>('/applications', { jobId, status }),

  updateStatus: (id: ApplicationId, status: ApplicationStatus): Promise<Application> =>
    api.patch<Application>(`/applications/${id}`, { status }),

  remove: (id: ApplicationId): Promise<{ ok: true }> =>
    api.delete<{ ok: true }>(`/applications/${id}`),

  addNote: (id: ApplicationId, body: string): Promise<Application> =>
    api.post<Application>(`/applications/${id}/notes`, { body }),
};
