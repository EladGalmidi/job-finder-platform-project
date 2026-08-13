import { nowIso } from '@/lib/dates';
import { isValidEmail, isValidFullName, isValidPassword } from '@/lib/validation';
import { ApiError, asUserId } from '@/types';
import type { AuthSession, AuthProvider, User, UserPreferences } from '@/types';

import { mockDb } from '../db/mockDb';
import { DEMO_USER } from '../data/user';
import type { HandlerContext, MockRoute } from '../transport/router';

/**
 * Any well-formed credentials succeed and return the seeded account. The literal
 * password `wrongpass` fails so the invalid-credentials state is reachable
 * without a developer tool.
 */
const INVALID_PASSWORD = 'wrongpass';

const asRecord = (body: unknown): Record<string, unknown> =>
  typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};

const readString = (body: unknown, key: string): string => {
  const value = asRecord(body)[key];
  return typeof value === 'string' ? value : '';
};

const issueSession = (user: User): AuthSession => {
  const token = `mock-token-${user.id}-${String(Date.now())}`;
  mockDb.mutate((draft) => {
    draft.sessions[token] = user.id;
    draft.users[user.id] = user;
  });
  return { token, user };
};

const requireUser = (context: HandlerContext): User => {
  if (context.userId === null) {
    throw new ApiError('UNAUTHORIZED', 'Not signed in', 401);
  }
  const user = mockDb.state.users[context.userId];
  if (user === undefined) {
    throw new ApiError('UNAUTHORIZED', 'Session no longer valid', 401);
  }
  return user;
};

export const currentUserOrThrow = requireUser;

export const authRoutes: readonly MockRoute[] = [
  {
    method: 'POST',
    pattern: '/auth/login',
    latency: 'normal',
    handler: ({ body }): AuthSession => {
      const email = readString(body, 'email');
      const password = readString(body, 'password');

      const details: Record<string, string> = {};
      if (!isValidEmail(email)) details['email'] = 'INVALID_EMAIL';
      if (!isValidPassword(password)) details['password'] = 'PASSWORD_TOO_SHORT';
      if (Object.keys(details).length > 0) {
        throw new ApiError('VALIDATION_FAILED', 'Check the highlighted fields', 422, details);
      }

      if (password === INVALID_PASSWORD) {
        throw new ApiError('INVALID_CREDENTIALS', 'Email or password is incorrect', 401);
      }

      return issueSession({ ...DEMO_USER, email });
    },
  },

  {
    method: 'POST',
    pattern: '/auth/signup',
    latency: 'normal',
    handler: ({ body }): AuthSession => {
      const fullName = readString(body, 'fullName');
      const email = readString(body, 'email');
      const password = readString(body, 'password');

      const details: Record<string, string> = {};
      if (!isValidFullName(fullName)) details['fullName'] = 'NAME_TOO_SHORT';
      if (!isValidEmail(email)) details['email'] = 'INVALID_EMAIL';
      if (!isValidPassword(password)) details['password'] = 'PASSWORD_TOO_SHORT';
      if (Object.keys(details).length > 0) {
        throw new ApiError('VALIDATION_FAILED', 'Check the highlighted fields', 422, details);
      }

      // New accounts start with no preferences and no CV so the onboarding
      // guard has something real to gate on.
      const user: User = {
        id: asUserId(`user-${String(Date.now())}`),
        fullName,
        email,
        avatarUrl: null,
        headline: null,
        provider: 'email',
        createdAt: nowIso(),
        onboardingCompletedAt: null,
        preferences: null,
        activeCvId: null,
      };

      return issueSession(user);
    },
  },

  {
    method: 'POST',
    pattern: '/auth/social/:provider',
    latency: 'slow',
    handler: ({ params }): AuthSession => {
      const provider = params['provider'];
      if (provider !== 'google' && provider !== 'linkedin') {
        throw new ApiError('VALIDATION_FAILED', 'Unsupported provider', 422);
      }

      const user: User = {
        ...DEMO_USER,
        provider: provider satisfies AuthProvider,
        onboardingCompletedAt: null,
        preferences: null,
        activeCvId: null,
        id: asUserId(`user-${provider}`),
        email: `${provider}.user@jobmatch.ai`,
      };

      return issueSession(user);
    },
  },

  {
    method: 'POST',
    pattern: '/auth/logout',
    latency: 'fast',
    handler: ({ userId }): { ok: true } => {
      mockDb.mutate((draft) => {
        for (const [token, owner] of Object.entries(draft.sessions)) {
          if (owner === userId) delete draft.sessions[token];
        }
      });
      return { ok: true };
    },
  },

  {
    method: 'GET',
    pattern: '/auth/me',
    latency: 'fast',
    auth: true,
    handler: (context): User => requireUser(context),
  },

  {
    method: 'PATCH',
    pattern: '/users/me',
    latency: 'normal',
    auth: true,
    handler: (context): User => {
      const user = requireUser(context);
      const fullName = readString(context.body, 'fullName').trim();
      const headline = readString(context.body, 'headline').trim();

      if (!isValidFullName(fullName)) {
        throw new ApiError('VALIDATION_FAILED', 'Check the highlighted fields', 422, {
          fullName: 'NAME_TOO_SHORT',
        });
      }

      // An empty headline is a deliberate clear, not a missing value.
      const updated: User = { ...user, fullName, headline: headline === '' ? null : headline };
      mockDb.mutate((draft) => {
        draft.users[user.id] = updated;
      });

      return updated;
    },
  },

  {
    method: 'PATCH',
    pattern: '/users/me/preferences',
    latency: 'normal',
    auth: true,
    handler: (context): User => {
      const user = requireUser(context);
      const preferences = context.body as UserPreferences;

      const updated: User = { ...user, preferences };
      mockDb.mutate((draft) => {
        draft.users[user.id] = updated;
      });

      return updated;
    },
  },

  {
    method: 'POST',
    pattern: '/users/me/onboarding/complete',
    latency: 'normal',
    auth: true,
    handler: (context): User => {
      const user = requireUser(context);
      const updated: User = { ...user, onboardingCompletedAt: nowIso() };

      mockDb.mutate((draft) => {
        draft.users[user.id] = updated;
      });

      return updated;
    },
  },
];
