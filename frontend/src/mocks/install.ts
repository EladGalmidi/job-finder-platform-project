import { __setTransport } from '@/services/http/client';

import { createMockTransport } from './transport/mockTransport';

/**
 * Installs the mock transport.
 *
 * This is the only path into `src/mocks` from application code, and it is only
 * ever reached through a dynamic import guarded by `isMockMode`. That guard is
 * what keeps the fixtures — 24 jobs, market snapshots, CV analyses, the whole
 * seeded database — out of a live build: Rollup puts everything reachable from
 * here in its own chunk, and a live build never asks for that chunk.
 *
 * A static import would defeat it. The fixtures are built at module scope, so
 * Rollup cannot prove they are side-effect free and would keep them even with
 * the branch folded away.
 */
export const installMockTransport = (): void => {
  __setTransport(createMockTransport());
};
