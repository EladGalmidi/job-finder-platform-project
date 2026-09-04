import { buildApp } from './app.js';
import { env } from './config/env.js';

/** Signals that should drain connections rather than drop them. */
const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'] as const;

const start = async (): Promise<void> => {
  const config = env();
  const app = await buildApp();

  for (const signal of SHUTDOWN_SIGNALS) {
    process.once(signal, () => {
      app.log.info({ signal }, 'shutting down');
      // In-flight requests finish before the process exits; killing them mid-way
      // is how half-written rows and duplicated work happen.
      void app.close().then(
        () => process.exit(0),
        (error: unknown) => {
          app.log.error({ err: error }, 'shutdown failed');
          process.exit(1);
        },
      );
    });
  }

  await app.listen({ port: config.PORT, host: config.HOST });
};

start().catch((error: unknown) => {
  // The logger lives on the app, which may not exist yet if configuration or
  // binding failed — so this one path writes to stderr directly.
  console.error('Server failed to start:', error instanceof Error ? error.message : error);
  process.exit(1);
});
