import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { createAppAsyncThunk, toRejectValue } from '@/app/createAppAsyncThunk';
import { STORAGE_KEYS, readJson, readString, remove, writeJson, writeString } from '@/lib/storage';
import { authApi } from '@/services/api/authApi';
import type {
  AuthSession,
  CvId,
  LoginPayload,
  RequestStatus,
  SerializedApiError,
  SignupPayload,
  User,
  UserPreferences,
} from '@/types';
import type { AnalysisJobId } from '@/types';

/**
 * Four states, not a boolean.
 *
 * On a cold load a token exists in storage but the user is not hydrated yet.
 * With `isAuthenticated: boolean` every guard would redirect to /login for one
 * frame before the session resolves. `idle` and `loading` prevent that flash.
 */
export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous';

export type OnboardingStep = 'welcome' | 'preferences' | 'cv' | 'analyzing' | 'results';

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  'welcome',
  'preferences',
  'cv',
  'analyzing',
  'results',
];

interface OnboardingState {
  step: OnboardingStep;
  draftPreferences: UserPreferences | null;
  cvId: CvId | null;
  analysisJobId: AnalysisJobId | null;
  skippedCv: boolean;
}

interface AuthState {
  status: AuthStatus;
  user: User | null;
  token: string | null;
  error: SerializedApiError | null;
  submitStatus: RequestStatus;
  onboarding: OnboardingState;
}

const emptyOnboarding: OnboardingState = {
  step: 'welcome',
  draftPreferences: null,
  cvId: null,
  analysisJobId: null,
  skippedCv: false,
};

const isOnboardingState = (value: unknown): value is OnboardingState => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return ONBOARDING_STEPS.includes(candidate['step'] as OnboardingStep);
};

/**
 * Onboarding progress is persisted so a refresh mid-flow resumes where the user
 * left off instead of dropping them back on the welcome screen. It is cleared
 * on completion and on logout.
 */
const persistOnboarding = (state: OnboardingState): void => {
  writeJson(STORAGE_KEYS.onboarding, {
    step: state.step,
    draftPreferences: state.draftPreferences,
    cvId: state.cvId,
    analysisJobId: state.analysisJobId,
    skippedCv: state.skippedCv,
  });
};

const loadOnboarding = (): OnboardingState =>
  readJson(STORAGE_KEYS.onboarding, isOnboardingState) ?? emptyOnboarding;

const clearOnboarding = (): OnboardingState => {
  remove(STORAGE_KEYS.onboarding);
  return emptyOnboarding;
};

const initialState: AuthState = {
  status: 'idle',
  user: null,
  token: readString(STORAGE_KEYS.authToken),
  error: null,
  submitStatus: 'idle',
  onboarding: loadOnboarding(),
};

/**
 * Runs once at startup. Resolves the stored token into a user, or settles on
 * `anonymous`. AuthBootstrap renders a splash until this finishes.
 */
export const bootstrapAuth = createAppAsyncThunk('auth/bootstrap', async (_: void, thunkApi) => {
  const token = readString(STORAGE_KEYS.authToken);
  if (token === null) return null;

  try {
    return await authApi.me();
  } catch (error) {
    // A stale token must not leave the app stuck in `loading`.
    remove(STORAGE_KEYS.authToken);
    return thunkApi.rejectWithValue(toRejectValue(error));
  }
});

const persistSession = (session: AuthSession): AuthSession => {
  writeString(STORAGE_KEYS.authToken, session.token);
  return session;
};

export const login = createAppAsyncThunk('auth/login', async (payload: LoginPayload, thunkApi) => {
  try {
    return persistSession(await authApi.login(payload));
  } catch (error) {
    return thunkApi.rejectWithValue(toRejectValue(error));
  }
});

export const signup = createAppAsyncThunk(
  'auth/signup',
  async (payload: SignupPayload, thunkApi) => {
    try {
      return persistSession(await authApi.signup(payload));
    } catch (error) {
      return thunkApi.rejectWithValue(toRejectValue(error));
    }
  },
);

export const socialLogin = createAppAsyncThunk(
  'auth/socialLogin',
  async (provider: 'google' | 'linkedin', thunkApi) => {
    try {
      return persistSession(await authApi.socialLogin(provider));
    } catch (error) {
      return thunkApi.rejectWithValue(toRejectValue(error));
    }
  },
);

export const logout = createAppAsyncThunk('auth/logout', async (_: void) => {
  try {
    await authApi.logout();
  } finally {
    // The token is cleared regardless of whether the server call succeeded.
    remove(STORAGE_KEYS.authToken);
  }
});

export const savePreferences = createAppAsyncThunk(
  'auth/savePreferences',
  async (preferences: UserPreferences, thunkApi) => {
    try {
      return await authApi.updatePreferences(preferences);
    } catch (error) {
      return thunkApi.rejectWithValue(toRejectValue(error));
    }
  },
);

export const completeOnboarding = createAppAsyncThunk(
  'auth/completeOnboarding',
  async (_: void, thunkApi) => {
    try {
      return await authApi.completeOnboarding();
    } catch (error) {
      return thunkApi.rejectWithValue(toRejectValue(error));
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    errorCleared(state) {
      state.error = null;
    },
    onboardingStepSet(state, action: PayloadAction<OnboardingStep>) {
      state.onboarding.step = action.payload;
      persistOnboarding(state.onboarding);
    },
    onboardingPreferencesDrafted(state, action: PayloadAction<UserPreferences>) {
      state.onboarding.draftPreferences = action.payload;
      persistOnboarding(state.onboarding);
    },
    onboardingCvSet(state, action: PayloadAction<CvId | null>) {
      state.onboarding.cvId = action.payload;
      state.onboarding.skippedCv = false;
      persistOnboarding(state.onboarding);
    },
    onboardingCvSkipped(state) {
      state.onboarding.cvId = null;
      state.onboarding.skippedCv = true;
      persistOnboarding(state.onboarding);
    },
    onboardingAnalysisJobSet(state, action: PayloadAction<AnalysisJobId | null>) {
      state.onboarding.analysisJobId = action.payload;
      persistOnboarding(state.onboarding);
    },
    onboardingReset(state) {
      state.onboarding = clearOnboarding();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuth.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        if (action.payload === null) {
          state.status = 'anonymous';
          state.user = null;
          return;
        }
        state.status = 'authenticated';
        state.user = action.payload;
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.status = 'anonymous';
        state.user = null;
        state.token = null;
      });

    for (const thunk of [login, signup, socialLogin]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.submitStatus = 'loading';
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.submitStatus = 'succeeded';
          state.status = 'authenticated';
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.onboarding = clearOnboarding();
        })
        .addCase(thunk.rejected, (state, action) => {
          state.submitStatus = 'failed';
          state.error = action.payload ?? null;
        });
    }

    builder.addCase(logout.fulfilled, (state) => {
      state.status = 'anonymous';
      state.user = null;
      state.token = null;
      state.error = null;
      state.submitStatus = 'idle';
      state.onboarding = clearOnboarding();
    });

    builder
      .addCase(savePreferences.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(completeOnboarding.fulfilled, (state, action) => {
        state.user = action.payload;
        state.onboarding = clearOnboarding();
      });
  },
});

export const {
  errorCleared,
  onboardingStepSet,
  onboardingPreferencesDrafted,
  onboardingCvSet,
  onboardingCvSkipped,
  onboardingAnalysisJobSet,
  onboardingReset,
} = authSlice.actions;

export const authReducer = authSlice.reducer;

interface AuthSliceRoot {
  auth: AuthState;
}

export const selectAuthStatus = (state: AuthSliceRoot): AuthStatus => state.auth.status;
export const selectCurrentUser = (state: AuthSliceRoot): User | null => state.auth.user;
export const selectAuthError = (state: AuthSliceRoot): SerializedApiError | null => state.auth.error;
export const selectSubmitStatus = (state: AuthSliceRoot): RequestStatus => state.auth.submitStatus;
export const selectOnboarding = (state: AuthSliceRoot): OnboardingState => state.auth.onboarding;

export const selectIsAuthenticated = createSelector(
  selectAuthStatus,
  (status) => status === 'authenticated',
);

export const selectHasCompletedOnboarding = createSelector(
  selectCurrentUser,
  (user) => user !== null && user.onboardingCompletedAt !== null,
);
