import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { applicationsReducer } from '@/features/applications/applicationsSlice';
import { authReducer } from '@/features/auth/authSlice';
import { cvReducer } from '@/features/cv/cvSlice';
import { insightsReducer } from '@/features/insights/insightsSlice';
import { jobsReducer } from '@/features/jobs/jobsSlice';
import { uiReducer } from '@/features/ui/uiSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  jobs: jobsReducer,
  cv: cvReducer,
  applications: applicationsReducer,
  insights: insightsReducer,
  ui: uiReducer,
});

/**
 * RootState is derived from the combined reducer rather than from the store, so
 * `makeStore(preloadedState: Partial<RootState>)` does not reference its own
 * return type.
 */
export type RootState = ReturnType<typeof rootReducer>;

/** Factory so tests can build an isolated store with preloaded state. */
export const makeStore = (preloadedState?: Partial<RootState>) =>
  configureStore({
    reducer: rootReducer,
    ...(preloadedState === undefined ? {} : { preloadedState }),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // File objects are passed to upload thunks and never stored in state.
          ignoredActionPaths: ['meta.arg', 'payload.file'],
        },
      }),
  });

export const store = makeStore();

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
