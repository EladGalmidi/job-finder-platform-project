import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

// Self-hosted fonts: Inter carries Latin and numerals, Heebo covers Hebrew.
import '@fontsource-variable/inter';
import '@fontsource-variable/heebo';

import { App } from './app/App';
import { store } from './app/store';

import './styles/globals.css';

const container = document.getElementById('root');

if (container === null) {
  // Fail loudly: a missing mount point is a build problem, not a runtime state.
  throw new Error('Root element #root was not found in index.html');
}

createRoot(container).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
