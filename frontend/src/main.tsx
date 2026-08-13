import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

// Self-hosted fonts: Inter carries Latin and numerals, Heebo covers Hebrew.
import '@fontsource-variable/inter';
import '@fontsource-variable/heebo';

import { isMockMode } from '@/services/http/client';

import { App } from './app/App';
import { store } from './app/store';

import './styles/globals.css';

const container = document.getElementById('root');

if (container === null) {
  // Fail loudly: a missing mount point is a build problem, not a runtime state.
  throw new Error('Root element #root was not found in index.html');
}

/**
 * The mock backend is installed before the first render, never imported
 * statically.
 *
 * `isMockMode()` folds to a constant at build time, so a live build drops this
 * branch and never emits the mock chunk — the fixtures stay out of production
 * instead of shipping as dead weight behind a runtime check.
 */
const bootstrap = async (): Promise<void> => {
  if (isMockMode()) {
    const { installMockTransport } = await import('@/mocks/install');
    installMockTransport();
  }

  createRoot(container).render(
    <StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </StrictMode>,
  );
};

void bootstrap();
