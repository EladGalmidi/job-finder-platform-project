import type { FastifyInstance, FastifyRequest } from 'fastify';

import { database } from '../db/client.js';
import type { UserRow } from '../db/schema.js';
import { unauthorized } from '../http/errors.js';
import { SESSION_COOKIE, setSessionCookie } from './cookies.js';
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

  app.addHook('onRequest', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token === undefined || token === '') return;

    const resolved = await userForToken(database().db, token, {
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    });

    if (resolved === null) {
      // Expired, revoked, or a reused token that has just cost the account all
      // of its sessions. Logged because a spike here is worth noticing.
      request.log.debug('session cookie did not resolve to a user');
      return;
    }

    request.currentUser = resolved.user;
    request.sessionToken = token;

    /*
     * The token was rotated, so the browser has to be given the replacement in
     * this response — the one it sent is now revoked and will fail on the next
     * request. sessionToken is updated too, or a logout in this same request
     * would revoke a token that is already dead and leave the new one live.
     */
    if (resolved.rotated !== undefined) {
      setSessionCookie(reply, resolved.rotated.token, resolved.rotated.expiresAt);
      request.sessionToken = resolved.rotated.token;
    }
  });
};
