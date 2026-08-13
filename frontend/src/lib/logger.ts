/**
 * Structured logging. Every entry carries a scope and a context object so logs
 * stay greppable and machine-readable instead of drifting into ad-hoc strings.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

const isDev = import.meta.env.DEV;

const emit = (level: LogLevel, scope: string, message: string, context?: LogContext): void => {
  if (level === 'debug' && !isDev) return;

  const entry = {
    level,
    scope,
    message,
    ...(context === undefined ? {} : { context }),
    at: new Date().toISOString(),
  };

  switch (level) {
    case 'error':
      console.error(entry);
      break;
    case 'warn':
      console.warn(entry);
      break;
    default:
      console.info(entry);
  }
};

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

export const createLogger = (scope: string): Logger => ({
  debug: (message, context) => {
    emit('debug', scope, message, context);
  },
  info: (message, context) => {
    emit('info', scope, message, context);
  },
  warn: (message, context) => {
    emit('warn', scope, message, context);
  },
  error: (message, context) => {
    emit('error', scope, message, context);
  },
});
