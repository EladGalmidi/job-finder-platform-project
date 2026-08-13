import { createSelector, createSlice } from '@reduxjs/toolkit';

import { createAppAsyncThunk, toRejectValue } from '@/app/createAppAsyncThunk';
import { applicationsApi } from '@/services/api/applicationsApi';
import type {
  Application,
  ApplicationId,
  ApplicationQuery,
  ApplicationStatus,
  JobId,
  RequestStatus,
  SerializedApiError,
} from '@/types';

/**
 * The single source of truth for whether a job is saved or applied to.
 *
 * `Job` deliberately carries no `isSaved` flag — duplicating that onto the job
 * entity is how the jobs list, the detail drawer and this page drift apart.
 */
interface ApplicationsState {
  entities: Record<string, Application>;
  byJobId: Record<string, ApplicationId>;
  status: RequestStatus;
  error: SerializedApiError | null;
  mutatingJobIds: string[];
}

const initialState: ApplicationsState = {
  entities: {},
  byJobId: {},
  status: 'idle',
  error: null,
  mutatingJobIds: [],
};

const index = (state: ApplicationsState, application: Application): void => {
  state.entities[application.id] = application;
  state.byJobId[application.jobId] = application.id;
};

export const fetchApplications = createAppAsyncThunk(
  'applications/fetch',
  async (query: ApplicationQuery, thunkApi) => {
    try {
      return await applicationsApi.list(query, thunkApi.signal);
    } catch (error) {
      return thunkApi.rejectWithValue(toRejectValue(error));
    }
  },
);

export const saveJob = createAppAsyncThunk('applications/save', async (jobId: JobId, thunkApi) => {
  try {
    return await applicationsApi.create(jobId, 'saved');
  } catch (error) {
    return thunkApi.rejectWithValue(toRejectValue(error));
  }
});

export const applyToJob = createAppAsyncThunk(
  'applications/apply',
  async (jobId: JobId, thunkApi) => {
    try {
      return await applicationsApi.create(jobId, 'applied');
    } catch (error) {
      return thunkApi.rejectWithValue(toRejectValue(error));
    }
  },
);

export const changeApplicationStatus = createAppAsyncThunk(
  'applications/changeStatus',
  async (payload: { id: ApplicationId; status: ApplicationStatus }, thunkApi) => {
    try {
      return await applicationsApi.updateStatus(payload.id, payload.status);
    } catch (error) {
      return thunkApi.rejectWithValue(toRejectValue(error));
    }
  },
);

export const removeApplication = createAppAsyncThunk(
  'applications/remove',
  async (id: ApplicationId, thunkApi) => {
    try {
      await applicationsApi.remove(id);
      return id;
    } catch (error) {
      return thunkApi.rejectWithValue(toRejectValue(error));
    }
  },
);

export const addApplicationNote = createAppAsyncThunk(
  'applications/addNote',
  async (payload: { id: ApplicationId; body: string }, thunkApi) => {
    try {
      return await applicationsApi.addNote(payload.id, payload.body);
    } catch (error) {
      return thunkApi.rejectWithValue(toRejectValue(error));
    }
  },
);

const applicationsSlice = createSlice({
  name: 'applications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchApplications.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchApplications.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.entities = {};
        state.byJobId = {};
        for (const application of action.payload) index(state, application);
      })
      .addCase(fetchApplications.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? null;
      });

    for (const thunk of [saveJob, applyToJob]) {
      builder
        .addCase(thunk.pending, (state, action) => {
          state.mutatingJobIds.push(action.meta.arg);
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.mutatingJobIds = state.mutatingJobIds.filter((id) => id !== action.meta.arg);
          index(state, action.payload);
        })
        .addCase(thunk.rejected, (state, action) => {
          state.mutatingJobIds = state.mutatingJobIds.filter((id) => id !== action.meta.arg);
          state.error = action.payload ?? null;
        });
    }

    builder
      .addCase(changeApplicationStatus.fulfilled, (state, action) => {
        index(state, action.payload);
      })
      .addCase(addApplicationNote.fulfilled, (state, action) => {
        index(state, action.payload);
      })
      .addCase(removeApplication.fulfilled, (state, action) => {
        const application = state.entities[action.payload];
        if (application !== undefined) {
          delete state.byJobId[application.jobId];
          delete state.entities[action.payload];
        }
      });
  },
});

export const applicationsReducer = applicationsSlice.reducer;

interface ApplicationsSliceRoot {
  applications: ApplicationsState;
}

export const selectApplicationEntities = (
  state: ApplicationsSliceRoot,
): Record<string, Application> => state.applications.entities;

export const selectApplicationsStatus = (state: ApplicationsSliceRoot): RequestStatus =>
  state.applications.status;

export const selectAllApplications = createSelector(selectApplicationEntities, (entities) =>
  Object.values(entities),
);

export const selectApplicationByJobId = (
  state: ApplicationsSliceRoot,
  jobId: JobId,
): Application | null => {
  const id = state.applications.byJobId[jobId];
  return id === undefined ? null : (state.applications.entities[id] ?? null);
};

export const selectIsJobMutating = (state: ApplicationsSliceRoot, jobId: JobId): boolean =>
  state.applications.mutatingJobIds.includes(jobId);

export const selectApplicationsByStatus = createSelector(selectAllApplications, (applications) => {
  const grouped: Record<ApplicationStatus, Application[]> = {
    saved: [],
    applied: [],
    interview: [],
    offer: [],
    rejected: [],
  };
  for (const application of applications) grouped[application.status].push(application);
  return grouped;
});
