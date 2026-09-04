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

export interface UserPreferences {
  desiredRoles: RoleKey[];
  seniority: Seniority;
  locations: string[];
  remoteMode: RemoteMode | 'any';
  jobTypes: JobType[];
  salary: SalaryRange;
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

/**
 * What a successful login returns.
 *
 * No token. The session lives in an httpOnly cookie the browser stores and
 * sends by itself, which script cannot read — that is the point, since an XSS
 * on the page then has nothing to steal. It also means the client cannot tell
 * whether it is signed in by looking at storage: it has to ask the server,
 * which is what bootstrapAuth does on every load.
 */
export interface AuthSession {
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
