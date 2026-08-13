import type { MockRoute } from '../transport/router';

import { applicationRoutes } from './applications';
import { authRoutes } from './auth';
import { cvRoutes } from './cv';
import { insightRoutes } from './insights';
import { jobRoutes } from './jobs';

/**
 * Order matters only where patterns could overlap; `/cv/active` is registered
 * before `/cv/:cvId/analysis` in its own module for that reason.
 */
export const routes: readonly MockRoute[] = [
  ...authRoutes,
  ...jobRoutes,
  ...cvRoutes,
  ...applicationRoutes,
  ...insightRoutes,
];
