import type { FastifyInstance, FastifyRequest } from 'fastify';

import { database } from '../db/client.js';
import type { UserRow } from '../db/schema.js';
import { unauthorized } from '../http/errors.js';
import { SESSION_COOKIE } from './cookies.js';
import { userForToken } from './sessions.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** The signed-in user, or null. Resolved once per request. */
    currentUser: UserRow | null;
    /** The raw session token, needed by logout to revoke this exact session. */
    sessionToken: string | null;
    /** The signed-in user, or a 401. Use this on any protected route. */
    requireUser: () => UserRow;
  }
}

/**
 * Resolves the session cookie into a user on every request.
 *
 * Done as a hook rather than inside each handler so no route can forget. The
 * hook only *resolves*; it never rejects. Deciding which routes need a user is
 * the route's job, and a global rejection here would mean login itself needed
 * an exception.
 */
export const registerAuth = (app: FastifyInstance): void => {
  app.decorateRequest('currentUser', null);
  app.decorateRequest('sessionToken', null);

  app.decorateRequest('requireUser', function (this: FastifyRequest): UserRow {
    if (this.currentUser === null) throw unauthorized('You need to be signed in');
    return this.currentUser;
  });

  app.addHook('onRequest', async (request) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token === undefined || token === '') return;

    request.sessionToken = token;
    request.currentUser = await userForToken(database().db, token);

    if (request.currentUser === null) {
      // Expired or revoked. Logged because a spike here is worth noticing —
      // it can mean sessions are being dropped, or tokens are being guessed.
      request.log.debug('session cookie did not resolve to a user');
    }
  });
};
