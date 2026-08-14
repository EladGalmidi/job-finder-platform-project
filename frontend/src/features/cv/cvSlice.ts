import { createSlice } from '@reduxjs/toolkit';

import { createAppAsyncThunk, toRejectValue } from '@/app/createAppAsyncThunk';
import { cvApi } from '@/services/api/cvApi';
import type {
  AnalysisJob,
  AnalysisJobId,
  CV,
  CVAnalysis,
  CvId,
  RequestStatus,
  SerializedApiError,
} from '@/types';

interface CvState {
  activeCvId: CvId | null;
  cvs: Record<string, CV>;
  analysesByCvId: Record<string, CVAnalysis>;
  uploadStatus: RequestStatus;
  uploadError: SerializedApiError | null;
  analysisStatus: RequestStatus;
  analysisError: SerializedApiError | null;
  analysisJob: AnalysisJob | null;
}

const initialState: CvState = {
  activeCvId: null,
  cvs: {},
  analysesByCvId: {},
  uploadStatus: 'idle',
  uploadError: null,
  analysisStatus: 'idle',
  analysisError: null,
  analysisJob: null,
};

export const fetchActiveCv = createAppAsyncThunk('cv/fetchActive', async (_: void, thunkApi) => {
  try {
    return await cvApi.active(thunkApi.signal);
  } catch (error) {
    return thunkApi.rejectWithValue(toRejectValue(error));
  }
});

export const uploadCv = createAppAsyncThunk('cv/upload', async (file: File, thunkApi) => {
  try {
    return await cvApi.upload(file);
  } catch (error) {
    return thunkApi.rejectWithValue(toRejectValue(error));
  }
});

export const importCvFromLinkedin = createAppAsyncThunk(
  'cv/importLinkedin',
  async (_: void, thunkApi) => {
    try {
      return await cvApi.importFromLinkedin();
    } catch (error) {
      return thunkApi.rejectWithValue(toRejectValue(error));
    }
  },
);

export const startCvAnalysis = createAppAsyncThunk(
  'cv/startAnalysis',
  async (cvId: CvId, thunkApi) => {
    try {
      return await cvApi.startAnalysis(cvId);
    } catch (error) {
      return thunkApi.rejectWithValue(toRejectValue(error));
    }
  },
);

/**
 * One poll tick. The component owning the analysing screen drives the interval
 * and passes its AbortSignal through, so navigating away stops the polling
 * instead of leaving a timer writing into a dead component's state.
 */
export const pollCvAnalysis = createAppAsyncThunk(
  'cv/pollAnalysis',
  async (analysisJobId: AnalysisJobId, thunkApi) => {
    try {
      return await cvApi.pollAnalysis(analysisJobId, thunkApi.signal);
    } catch (error) {
      return thunkApi.rejectWithValue(toRejectValue(error));
    }
  },
);

export const fetchCvAnalysis = createAppAsyncThunk(
  'cv/fetchAnalysis',
  async (cvId: CvId, thunkApi) => {
    try {
      return await cvApi.analysis(cvId, thunkApi.signal);
    } catch (error) {
      return thunkApi.rejectWithValue(toRejectValue(error));
    }
  },
);

const cvSlice = createSlice({
  name: 'cv',
  initialState,
  reducers: {
    /** Clears a previous upload failure, so picking a new file starts clean. */
    uploadErrorCleared(state) {
      state.uploadError = null;
      state.uploadStatus = 'idle';
    },
    analysisJobCleared(state) {
      state.analysisJob = null;
      state.analysisStatus = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchActiveCv.fulfilled, (state, action) => {
      if (action.payload === null) {
        state.activeCvId = null;
        return;
      }
      state.cvs[action.payload.id] = action.payload;
      state.activeCvId = action.payload.id;
    });

    for (const thunk of [uploadCv, importCvFromLinkedin]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.uploadStatus = 'loading';
          state.uploadError = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.uploadStatus = 'succeeded';
          state.cvs[action.payload.id] = action.payload;
          state.activeCvId = action.payload.id;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.uploadStatus = 'failed';
          state.uploadError = action.payload ?? null;
        });
    }

    builder
      .addCase(startCvAnalysis.pending, (state) => {
        state.analysisStatus = 'loading';
        state.analysisError = null;
        state.analysisJob = null;
      })
      .addCase(startCvAnalysis.rejected, (state, action) => {
        state.analysisStatus = 'failed';
        state.analysisError = action.payload ?? null;
      });

    builder
      .addCase(pollCvAnalysis.fulfilled, (state, action) => {
        state.analysisJob = action.payload;
        state.analysisStatus = action.payload.status === 'succeeded' ? 'succeeded' : 'loading';
      })
      .addCase(pollCvAnalysis.rejected, (state, action) => {
        // A cancelled poll is not a failure — it is the user navigating away.
        if (action.payload?.code === 'CANCELLED') return;
        state.analysisStatus = 'failed';
        state.analysisError = action.payload ?? null;
      });

    builder.addCase(fetchCvAnalysis.fulfilled, (state, action) => {
      state.analysesByCvId[action.payload.cvId] = action.payload;
    });
  },
});

export const { analysisJobCleared, uploadErrorCleared } = cvSlice.actions;
export const cvReducer = cvSlice.reducer;

interface CvSliceRoot {
  cv: CvState;
}

export const selectActiveCv = (state: CvSliceRoot): CV | null =>
  state.cv.activeCvId === null ? null : (state.cv.cvs[state.cv.activeCvId] ?? null);

export const selectActiveAnalysis = (state: CvSliceRoot): CVAnalysis | null =>
  state.cv.activeCvId === null ? null : (state.cv.analysesByCvId[state.cv.activeCvId] ?? null);

/**
 * Looks an analysis up by CV id rather than by the active pointer.
 *
 * `activeCvId` is only populated by an upload or by fetching the active CV, so
 * a page loaded directly into the flow has the analysis but no pointer.
 */
export const selectAnalysisForCv = (state: CvSliceRoot, cvId: CvId | null): CVAnalysis | null =>
  cvId === null ? null : (state.cv.analysesByCvId[cvId] ?? null);

export const selectAnalysisJob = (state: CvSliceRoot): AnalysisJob | null => state.cv.analysisJob;
export const selectUploadStatus = (state: CvSliceRoot): RequestStatus => state.cv.uploadStatus;
export const selectUploadError = (state: CvSliceRoot): SerializedApiError | null =>
  state.cv.uploadError;
