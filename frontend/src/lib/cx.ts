/**
 * Joins class names, dropping anything falsy.
 *
 * CSS Module lookups are typed `string | undefined` under
 * `noUncheckedIndexedAccess`, so building class strings with template literals
 * can silently emit the text "undefined" into the DOM. This makes that
 * impossible.
 */
export const cx = (...values: (string | false | null | undefined)[]): string =>
  values.filter((value): value is string => typeof value === 'string' && value !== '').join(' ');
