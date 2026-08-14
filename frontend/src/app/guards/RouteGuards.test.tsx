import { screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import { daysAgo } from '@/lib/dates';
import { asUserId } from '@/types';
import type { RootState } from '@/app/store';
import type { User } from '@/types';

import { OnboardingGuard, ProtectedRoute, PublicOnlyRoute } from './RouteGuards';

const user = (onboarded: boolean): User => ({
  id: asUserId('user-test'),
  fullName: 'Test Person',
  email: 'test@jobmatch.ai',
  avatarUrl: null,
  headline: null,
  provider: 'email',
  createdAt: daysAgo(1),
  onboardingCompletedAt: onboarded ? daysAgo(1) : null,
  preferences: null,
  activeCvId: null,
});

const authState = (
  status: 'authenticated' | 'anonymous',
  onboarded: boolean,
): Partial<RootState> => ({
  auth: {
    status,
    user: status === 'authenticated' ? user(onboarded) : null,
    token: status === 'authenticated' ? 'token' : null,
    error: null,
    submitStatus: 'idle',
    onboarding: {
      step: 'welcome',
      draftPreferences: null,
      cvId: null,
      analysisJobId: null,
      skippedCv: false,
    },
  },
});

const renderAt = (path: string, preloadedState: Partial<RootState>): void => {
  renderWithProviders(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>login screen</p>} />
        <Route element={<PublicOnlyRoute />}>
          <Route path="/public" element={<p>public screen</p>} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<OnboardingGuard expectComplete />}>
            <Route path="/dashboard" element={<p>dashboard screen</p>} />
            <Route path="/dashboard/cv/upload" element={<p>cv upload screen</p>} />
          </Route>
          <Route element={<OnboardingGuard expectComplete={false} />}>
            <Route path="/onboarding" element={<p>onboarding screen</p>} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>,
    { preloadedState },
  );
};

describe('route guards', () => {
  it('sends anonymous visitors from a protected route to login', () => {
    renderAt('/dashboard', authState('anonymous', false));
    expect(screen.getByText('login screen')).toBeInTheDocument();
  });

  it('lets an onboarded user reach the dashboard', () => {
    renderAt('/dashboard', authState('authenticated', true));
    expect(screen.getByText('dashboard screen')).toBeInTheDocument();
  });

  it('redirects an un-onboarded user away from the dashboard', () => {
    renderAt('/dashboard', authState('authenticated', false));
    expect(screen.queryByText('dashboard screen')).not.toBeInTheDocument();
  });

  it('redirects an onboarded user away from onboarding', () => {
    renderAt('/onboarding', authState('authenticated', true));
    expect(screen.queryByText('onboarding screen')).not.toBeInTheDocument();
  });

  it('keeps an un-onboarded user inside onboarding', () => {
    renderAt('/onboarding', authState('authenticated', false));
    expect(screen.getByText('onboarding screen')).toBeInTheDocument();
  });

  /**
   * Replacing a CV has to live outside /onboarding.
   *
   * Every "Upload new CV" control used to point at /onboarding/cv, which this
   * guard bounces back to the dashboard for anyone who has finished onboarding.
   * The buttons therefore did nothing, and there was no way to change your CV
   * at all — the product's central feature, unreachable.
   */
  it('lets an onboarded user reach the CV upload page', () => {
    renderAt('/dashboard/cv/upload', authState('authenticated', true));
    expect(screen.getByText('cv upload screen')).toBeInTheDocument();
  });

  it('keeps signed-in users off public-only routes', () => {
    renderAt('/public', authState('authenticated', true));
    expect(screen.queryByText('public screen')).not.toBeInTheDocument();
  });

  it('shows public-only routes to anonymous visitors', () => {
    renderAt('/public', authState('anonymous', false));
    expect(screen.getByText('public screen')).toBeInTheDocument();
  });
});
