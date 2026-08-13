import type { Activity, Alert, AlertId, DashboardMetrics, MarketRoleSnapshot, RoleKey } from '@/types';

import { api } from '../http/client';

export const insightsApi = {
  alerts: (signal?: AbortSignal): Promise<readonly Alert[]> =>
    api.get<readonly Alert[]>('/alerts', signal === undefined ? undefined : { signal }),

  updateAlert: (id: AlertId, patch: { isRead?: boolean; isDismissed?: boolean }): Promise<Alert> =>
    api.patch<Alert>(`/alerts/${id}`, patch),

  activity: (limit = 10, signal?: AbortSignal): Promise<readonly Activity[]> =>
    api.get<readonly Activity[]>('/activity', {
      params: { limit },
      ...(signal === undefined ? {} : { signal }),
    }),

  market: (roleKey: RoleKey, signal?: AbortSignal): Promise<MarketRoleSnapshot> =>
    api.get<MarketRoleSnapshot>(
      `/market/roles/${roleKey}`,
      signal === undefined ? undefined : { signal },
    ),

  dashboardMetrics: (signal?: AbortSignal): Promise<DashboardMetrics> =>
    api.get<DashboardMetrics>('/dashboard/metrics', signal === undefined ? undefined : { signal }),
};
