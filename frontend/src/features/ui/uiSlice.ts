import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

import { STORAGE_KEYS, readString, writeString } from '@/lib/storage';
import type { Direction, Locale, Theme } from '@/types';

export type ToastSeverity = 'info' | 'success' | 'warning' | 'danger';

export interface Toast {
  readonly id: string;
  readonly severity: ToastSeverity;
  readonly title: string;
  readonly message?: string;
  readonly durationMs: number;
}

interface UiState {
  theme: Theme;
  locale: Locale;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  toasts: Toast[];
}

const systemTheme = (): Theme => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const readTheme = (): Theme => {
  const stored = readString(STORAGE_KEYS.theme);
  return stored === 'light' || stored === 'dark' ? stored : systemTheme();
};

const readLocale = (): Locale => {
  const stored = readString(STORAGE_KEYS.locale);
  return stored === 'en' || stored === 'he' ? stored : 'en';
};

const initialState: UiState = {
  theme: readTheme(),
  locale: readLocale(),
  sidebarCollapsed: readString(STORAGE_KEYS.sidebarCollapsed) === 'true',
  mobileNavOpen: false,
  toasts: [],
};

/** Direction is derived, never stored — two sources would eventually disagree. */
export const directionForLocale = (locale: Locale): Direction => (locale === 'he' ? 'rtl' : 'ltr');

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    themeSet(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
      writeString(STORAGE_KEYS.theme, action.payload);
    },
    themeToggled(state) {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      writeString(STORAGE_KEYS.theme, state.theme);
    },
    localeSet(state, action: PayloadAction<Locale>) {
      state.locale = action.payload;
      writeString(STORAGE_KEYS.locale, action.payload);
    },
    sidebarToggled(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      writeString(STORAGE_KEYS.sidebarCollapsed, String(state.sidebarCollapsed));
    },
    mobileNavToggled(state) {
      state.mobileNavOpen = !state.mobileNavOpen;
    },
    mobileNavClosed(state) {
      state.mobileNavOpen = false;
    },
    toastPushed: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts.push(action.payload);
      },
      prepare(input: {
        severity: ToastSeverity;
        title: string;
        message?: string;
        durationMs?: number;
      }) {
        return {
          payload: {
            id: nanoid(),
            severity: input.severity,
            title: input.title,
            ...(input.message === undefined ? {} : { message: input.message }),
            durationMs: input.durationMs ?? 5000,
          } satisfies Toast,
        };
      },
    },
    toastDismissed(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
  },
});

export const {
  themeSet,
  themeToggled,
  localeSet,
  sidebarToggled,
  mobileNavToggled,
  mobileNavClosed,
  toastPushed,
  toastDismissed,
} = uiSlice.actions;

export const uiReducer = uiSlice.reducer;

interface UiSliceRoot {
  ui: UiState;
}

export const selectTheme = (state: UiSliceRoot): Theme => state.ui.theme;
export const selectLocale = (state: UiSliceRoot): Locale => state.ui.locale;
export const selectDirection = (state: UiSliceRoot): Direction =>
  directionForLocale(state.ui.locale);
export const selectSidebarCollapsed = (state: UiSliceRoot): boolean => state.ui.sidebarCollapsed;
export const selectMobileNavOpen = (state: UiSliceRoot): boolean => state.ui.mobileNavOpen;
export const selectToasts = (state: UiSliceRoot): readonly Toast[] => state.ui.toasts;
