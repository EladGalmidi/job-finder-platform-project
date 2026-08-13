import { daysAgo } from '@/lib/dates';
import { asCvId, asUserId } from '@/types';
import type { User, UserPreferences } from '@/types';

export const DEMO_PASSWORD = 'demo1234';

export const DEMO_PREFERENCES: UserPreferences = {
  desiredRoles: ['frontend', 'fullstack'],
  seniority: 'mid',
  locations: ['Tel Aviv', 'Herzliya', 'Ramat Gan'],
  remoteMode: 'hybrid',
  jobTypes: ['fullTime'],
  salary: { min: 25000, max: 35000, currency: 'ILS', period: 'month' },
};

/**
 * The seeded account. Mock auth accepts any well-formed credentials and returns
 * this user; signing in with DEMO_PASSWORD is the documented happy path, and
 * the literal string `wrongpass` triggers the invalid-credentials error state
 * so that failure UI is reachable without a dev tool.
 */
export const DEMO_USER: User = {
  id: asUserId('user-demo'),
  fullName: 'Alex Ronen',
  email: 'demo@jobmatch.ai',
  avatarUrl: null,
  headline: 'Frontend Engineer · React & TypeScript',
  provider: 'email',
  createdAt: daysAgo(45),
  onboardingCompletedAt: daysAgo(30),
  preferences: DEMO_PREFERENCES,
  activeCvId: asCvId('cv-demo'),
};

/** A second account used to exercise the onboarding guard end to end. */
export const NEW_USER: User = {
  id: asUserId('user-new'),
  fullName: 'New Candidate',
  email: 'new@jobmatch.ai',
  avatarUrl: null,
  headline: null,
  provider: 'email',
  createdAt: daysAgo(0),
  onboardingCompletedAt: null,
  preferences: null,
  activeCvId: null,
};
