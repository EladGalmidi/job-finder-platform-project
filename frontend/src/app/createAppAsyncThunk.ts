import { createAsyncThunk } from '@reduxjs/toolkit';

import { normalizeError } from '@/services/http/errors';
import { serializeApiError, type SerializedApiError } from '@/types';

import type { AppDispatch, RootState } from './store';

/**
 * Every thunk in the app is built from this so that failures arrive in slices as
 * a structured `SerializedApiError` rather than a stringified Error. Redux state
 * must stay serialisable, and reducers branch on `code`.
 */
export const createAppAsyncThunk = createAsyncThunk.withTypes<{
  state: RootState;
  dispatch: AppDispatch;
  rejectValue: SerializedApiError;
}>();

export const toRejectValue = (error: unknown): SerializedApiError =>
  serializeApiError(normalizeError(error));
