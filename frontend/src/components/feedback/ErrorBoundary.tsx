import { Component, type ErrorInfo, type ReactNode } from 'react';

import { createLogger } from '@/lib/logger';

const log = createLogger('errorBoundary');

interface Props {
  readonly children: ReactNode;
  readonly fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Last line of defence for render-time crashes. Route-level failures are handled
 * by the router's errorElement; this catches everything else.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    log.error('render failed', {
      message: error.message,
      componentStack: info.componentStack ?? undefined,
    });
  }

  override render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
