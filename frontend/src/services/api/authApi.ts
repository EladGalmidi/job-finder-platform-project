import { api } from '../http/client';

import type { AuthSession, LoginPayload, SignupPayload, User, UserPreferences } from '@/types';

/**
 * Service functions speak real URLs and real payloads. Nothing below this layer
 * knows whether a mock or a live backend answered.
 */
export const authApi = {
  login: (payload: LoginPayload): Promise<AuthSession> => api.post<AuthSession>('/auth/login', payload),

  signup: (payload: SignupPayload): Promise<AuthSession> =>
    api.post<AuthSession>('/auth/signup', payload),

  socialLogin: (provider: 'google' | 'linkedin'): Promise<AuthSession> =>
    api.post<AuthSession>(`/auth/social/${provider}`),

  logout: (): Promise<{ ok: true }> => api.post<{ ok: true }>('/auth/logout'),

  me: (signal?: AbortSignal): Promise<User> =>
    api.get<User>('/auth/me', signal === undefined ? undefined : { signal }),

  updatePreferences: (preferences: UserPreferences): Promise<User> =>
    api.patch<User>('/users/me/preferences', preferences),

  completeOnboarding: (): Promise<User> => api.post<User>('/users/me/onboarding/complete'),
};
