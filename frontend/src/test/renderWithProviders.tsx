import { render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { Provider } from 'react-redux';

import { makeStore, type AppStore, type RootState } from '@/app/store';

export interface RenderOptions {
  readonly preloadedState?: Partial<RootState>;
  readonly store?: AppStore;
}

/**
 * Renders with a real store so tests exercise selectors and reducers rather than
 * a hand-stubbed context. Return type is inferred to stay in step with whatever
 * queries Testing Library exposes.
 */
export const renderWithProviders = (
  ui: ReactElement,
  { preloadedState, store = makeStore(preloadedState) }: RenderOptions = {},
) => {
  const Wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
    <Provider store={store}>{children}</Provider>
  );

  return { store, ...render(ui, { wrapper: Wrapper }) };
};
