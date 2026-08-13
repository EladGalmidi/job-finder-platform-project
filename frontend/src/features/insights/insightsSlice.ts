import { createSelector, createSlice } from '@reduxjs/toolkit';

import { createAppAsyncThunk, toRejectValue } from '@/app/createAppAsyncThunk';
import { insightsApi } from '@/services/api/insightsApi';
import type {
  Activity,
  Alert,
  AlertId,
  DashboardMetrics,
  MarketRoleSnapshot,
  RequestStatus,
  RoleKey,
  SerializedApiError,
} from '@/types';

/**
 * Alerts, activity and market data are server-owned. They deliberately do not
 * live in the `ui` slice — that slice is for client-only concerns, and putting
 * fetched data there makes it unfetchable and untestable.
 */
interface InsightsState {
  alerts: Record<string, Alert>;
  alertsStatus: RequestStatus;
  activity: Activity[];
  activityStatus: RequestStatus;
  market: Record<string, MarketRoleSnapshot>;
  marketStatus: RequestStatus;
  metrics: DashboardMetrics | null;
  metricsStatus: RequestStatus;
  error: SerializedApiError | null;
}

const initialState: InsightsState = {
  alerts: {},
  alertsStatus: 'idle',
  activity: [],
  activityStatus: 'idle',
  market: {},
  marketStatus: 'idle',
  metrics: null,
  metricsStatus: 'idle',
  error: null,
};

export const fetchAlerts = createAppAsyncThunk('insights/fetchAlerts', async (_: void, thunkApi) => {
  try {
    return await insightsApi.alerts(thunkApi.signal);
  } catch (error) {
    return thunkApi.rejectWithValue(toRejectValue(error));
  }
});

export const dismissAlert = createAppAsyncThunk(
  'insights/dismissAlert',
  async (id: AlertId, thunkApi) => {
    try {
      return await insightsApi.updateAlert(id, { isDismissed: true });
    } catch (error) {
      return thunkApi.rejectWithValue(toRejectValue(error));
    }
  },
);

export const markAlertRead = createAppAsyncThunk(
  'insights/markAlertRead',
  async (id: AlertId, thunkApi) => {
    try {
      return await insightsApi.updateAlert(id, { isRead: true });
    } catch (error) {
      return thunkApi.rejectWithValue(toRejectValue(error));
    }
  },
);

export const fetchActivity = createAppAsyncThunk(
  'insights/fetchActivity',
  async (limit: number | undefined, thunkApi) => {
    try {
      return await insightsApi.activity(limit ?? 10, thunkApi.signal);
    } catch (error) {
      return thunkApi.rejectWithValue(toRejectValue(error));
    }
  },
);

export const fetchMarketSnapshot = createAppAsyncThunk(
  'insights/fetchMarket',
  async (roleKey: RoleKey, thunkApi) => {
    try {
      return await insightsApi.market(roleKey, thunkApi.signal);
    } catch (error) {
      return thunkApi.rejectWithValue(toRejectValue(error));
    }
  },
);

export const fetchDashboardMetrics = createAppAsyncThunk(
  'insights/fetchMetrics',
  async (_: void, thunkApi) => {
    try {
      return await insightsApi.dashboardMetrics(thunkApi.signal);
    } catch (error) {
      return thunkApi.rejectWithValue(toRejectValue(error));
    }
  },
);

const insightsSlice = createSlice({
  name: 'insights',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAlerts.pending, (state) => {
        state.alertsStatus = 'loading';
      })
      .addCase(fetchAlerts.fulfilled, (state, action) => {
        state.alertsStatus = 'succeeded';
        state.alerts = Object.fromEntries(action.payload.map((alert) => [alert.id, alert]));
      })
      .addCase(fetchAlerts.rejected, (state, action) => {
        state.alertsStatus = 'failed';
        state.error = action.payload ?? null;
      });

    builder
      .addCase(dismissAlert.fulfilled, (state, action) => {
        // Dismissed alerts leave the store entirely so the list shrinks.
        delete state.alerts[action.payload.id];
      })
      .addCase(markAlertRead.fulfilled, (state, action) => {
        state.alerts[action.payload.id] = action.payload;
      });

    builder
      .addCase(fetchActivity.pending, (state) => {
        state.activityStatus = 'loading';
      })
      .addCase(fetchActivity.fulfilled, (state, action) => {
        state.activityStatus = 'succeeded';
        state.activity = [...action.payload];
      })
      .addCase(fetchActivity.rejected, (state) => {
        state.activityStatus = 'failed';
      });

    builder
      .addCase(fetchMarketSnapshot.pending, (state) => {
        state.marketStatus = 'loading';
      })
      .addCase(fetchMarketSnapshot.fulfilled, (state, action) => {
        state.marketStatus = 'succeeded';
        state.market[action.payload.roleKey] = action.payload;
      })
      .addCase(fetchMarketSnapshot.rejected, (state, action) => {
        state.marketStatus = 'failed';
        state.error = action.payload ?? null;
      });

    builder
      .addCase(fetchDashboardMetrics.pending, (state) => {
        state.metricsStatus = 'loading';
      })
      .addCase(fetchDashboardMetrics.fulfilled, (state, action) => {
        state.metricsStatus = 'succeeded';
        state.metrics = action.payload;
      })
      .addCase(fetchDashboardMetrics.rejected, (state) => {
        state.metricsStatus = 'failed';
      });
  },
});

export const insightsReducer = insightsSlice.reducer;

interface InsightsSliceRoot {
  insights: InsightsState;
}

const selectAlertEntities = (state: InsightsSliceRoot): Record<string, Alert> =>
  state.insights.alerts;

export const selectAlerts = createSelector(selectAlertEntities, (alerts) => Object.values(alerts));

export const selectUnreadAlertCount = createSelector(
  selectAlerts,
  (alerts) => alerts.filter((alert) => !alert.isRead).length,
);

export const selectActivity = (state: InsightsSliceRoot): readonly Activity[] =>
  state.insights.activity;

export const selectMarketSnapshot = (
  state: InsightsSliceRoot,
  roleKey: RoleKey,
): MarketRoleSnapshot | null => state.insights.market[roleKey] ?? null;

export const selectDashboardMetrics = (state: InsightsSliceRoot): DashboardMetrics | null =>
  state.insights.metrics;

export const selectMetricsStatus = (state: InsightsSliceRoot): RequestStatus =>
  state.insights.metricsStatus;

export const selectMarketStatus = (state: InsightsSliceRoot): RequestStatus =>
  state.insights.marketStatus;
