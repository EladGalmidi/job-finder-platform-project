/**
 * Canonical breakpoints.
 *
 * CSS custom properties cannot be used inside @media queries, so these values
 * are repeated as literals in CSS modules. This file is the source of truth:
 * every module that uses a breakpoint carries a comment pointing here, and any
 * change must be applied to both places.
 *
 *   sm  600px   phone -> large phone
 *   md  900px   tablet -> desktop; sidebar appears at this width
 *   lg  1200px  wide desktop
 *   xl  1440px  max content width reached
 */
export const BREAKPOINTS = {
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1440,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

export const mediaUp = (key: BreakpointKey): string =>
  `(min-width: ${String(BREAKPOINTS[key])}px)`;

export const mediaDown = (key: BreakpointKey): string =>
  `(max-width: ${String(BREAKPOINTS[key] - 1)}px)`;
