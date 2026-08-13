import type {
  CvId,
  ISODateTime,
  JobType,
  RemoteMode,
  RoleKey,
  SalaryRange,
  Seniority,
  UserId,
} from './common';

export type AuthProvider = 'email' | 'google' | 'linkedin';

export type Availability = 'immediate' | 'oneMonth' | 'threeMonths';

export interface UserPreferences {
  desiredRoles: RoleKey[];
  seniority: Seniority;
  locations: string[];
  remoteMode: RemoteMode | 'any';
  jobTypes: JobType[];
  salary: SalaryRange;
  availability: Availability;
  willingToRelocate: boolean;
}

export interface User {
  id: UserId;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  headline: string | null;
  provider: AuthProvider;
  createdAt: ISODateTime;
  /** Null until the onboarding flow completes; drives OnboardingGuard. */
  onboardingCompletedAt: ISODateTime | null;
  preferences: UserPreferences | null;
  activeCvId: CvId | null;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  fullName: string;
  email: string;
  password: string;
}
