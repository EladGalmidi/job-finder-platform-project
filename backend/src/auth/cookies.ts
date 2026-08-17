import type { FastifyReply } from 'fastify';

import { env } from '../config/env.js';

export const SESSION_COOKIE = 'jobmatch_session';

/**
 * Cookie attributes, and why each one is there:
 *
 * - httpOnly: script cannot read it. This is the whole reason for moving off a
 *   localStorage bearer token — an XSS on the page can no longer steal the
 *   session, because JavaScript has no way to see it.
 * - sameSite lax: the cookie rides along with normal navigation but not with
 *   cross-site form posts, which is what blocks CSRF for state-changing calls.
 * - secure: HTTPS only. Off in development because localhost is plain HTTP and
 *   the browser would otherwise silently discard the cookie.
 * - path /: sent to every endpoint, since every endpoint may need the session.
 */
const attributes = (expiresAt: Date) => {
  const production = env().NODE_ENV === 'production';

  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: production,
    path: '/',
    expires: expiresAt,
  };
};

export const setSessionCookie = (reply: FastifyReply, token: string, expiresAt: Date): void => {
  reply.setCookie(SESSION_COOKIE, token, attributes(expiresAt));
};

export const clearSessionCookie = (reply: FastifyReply): void => {
  // Cleared with the same attributes it was set with. A mismatch on path or
  // sameSite leaves the original cookie in place and logout silently fails.
  reply.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env().NODE_ENV === 'production',
    path: '/',
  });
};
