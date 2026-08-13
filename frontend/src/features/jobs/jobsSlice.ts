import { createSlice } from '@reduxjs/toolkit';

import { createAppAsyncThunk, toRejectValue } from '@/app/createAppAsyncThunk';
import { fetchApplications } from '@/features/applications/applicationsSlice';
import { jobsApi, toJobParams } from '@/services/api/jobsApi';
import type { Job, JobId, JobMatch, JobQuery, RequestStatus, SerializedApiError } from '@/types';

/**
 * Results are cached per query, entities are stored once.
 *
 * The query itself lives in the URL, not here — this slice only remembers what
 * the server answered for a given query key.
 */
export const jobsQueryKey = (query: JobQuery): string => {
  const params = toJobParams(query);
  return Object.keys(params)
    .sort()
    .map((key) => `${key}=${String(params[key])}`)
    .join('&');
};

interface JobListState {
  ids: JobId[];
  total: number;
  hasMore: boolean;
  status: RequestStatus;
  error: SerializedApiError | null;
}

interface JobsState {
  entities: Record<string, Job>;
  matches: Record<string, JobMatch>;
  lists: Record<string, JobListState>;
  detailStatus: Record<string, RequestStatus>;
  similarByJobId: Record<string, JobId[]>;
}

const initialState: JobsState = {
  entities: {},
  matches: {},
  lists: {},
  detailStatus: {},
  similarByJobId: {},
};

const emptyList = (): JobListState => ({
  ids: [],
  total: 0,
  hasMore: false,
  status: 'loading',
  error: null,
});

export const fetchJobs = createAppAsyncThunk(
  'jobs/fetch',
  async (query: JobQuery, thunkApi) => {
    try {
      const page = await jobsApi.list(query, thunkApi.signal);
      return { key: jobsQueryKey(query), page };
    } catch (error) {
      return thunkApi.rejectWithValue(toRejectValue(error));
    }
  },
);

export const fetchJobDetail = createAppAsyncThunk(
  'jobs/fetchDetail',
  async (jobId: JobId, thunkApi) => {
    try {
      return await jobsApi.detail(jobId, thunkApi.signal);
    } catch (error) {
      return thunkApi.rejectWithValue(toRejectValue(error));
    }
  },
);

const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobs.pending, (state, action) => {
        const key = jobsQueryKey(action.meta.arg);
        state.lists[key] = { ...(state.lists[key] ?? emptyList()), status: 'loading', error: null };
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        const { key, page } = action.payload;

        for (const item of page.items) {
          state.entities[item.job.id] = item.job;
          if (item.match !== null) state.matches[item.job.id] = item.match;
        }

        state.lists[key] = {
          ids: page.items.map((item) => item.job.id),
          total: page.total,
          hasMore: page.hasMore,
          status: 'succeeded',
          error: null,
        };
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        const key = jobsQueryKey(action.meta.arg);
        state.lists[key] = {
          ...(state.lists[key] ?? emptyList()),
          status: 'failed',
          error: action.payload ?? null,
        };
      });

    builder
      .addCase(fetchJobDetail.pending, (state, action) => {
        state.detailStatus[action.meta.arg] = 'loading';
      })
      .addCase(fetchJobDetail.fulfilled, (state, action) => {
        const { job, match, similarJobIds } = action.payload;
        state.entities[job.id] = job;
        if (match !== null) state.matches[job.id] = match;
        state.similarByJobId[job.id] = [...similarJobIds];
        state.detailStatus[job.id] = 'succeeded';
      })
      .addCase(fetchJobDetail.rejected, (state, action) => {
        state.detailStatus[action.meta.arg] = 'failed';
      });

    /*
     * Applications arrive with their job joined in. Absorbing those jobs here
     * keeps job entities in one slice, so the applications page can render a
     * title and company without a second round trip.
     */
    builder.addCase(fetchApplications.fulfilled, (state, action) => {
      for (const { job } of action.payload) {
        state.entities[job.id] = job;
      }
    });
  },
});

export const jobsReducer = jobsSlice.reducer;

interface JobsSliceRoot {
  jobs: JobsState;
}

export const selectJobEntities = (state: JobsSliceRoot): Record<string, Job> => state.jobs.entities;
export const selectJobMatches = (state: JobsSliceRoot): Record<string, JobMatch> =>
  state.jobs.matches;

export const selectJobList = (state: JobsSliceRoot, key: string): JobListState | null =>
  state.jobs.lists[key] ?? null;

export const selectJobById = (state: JobsSliceRoot, jobId: JobId): Job | null =>
  state.jobs.entities[jobId] ?? null;

export const selectMatchByJobId = (state: JobsSliceRoot, jobId: JobId): JobMatch | null =>
  state.jobs.matches[jobId] ?? null;

export const selectJobDetailStatus = (state: JobsSliceRoot, jobId: JobId): RequestStatus =>
  state.jobs.detailStatus[jobId] ?? 'idle';
