import type { en } from './en';

export type TranslationKey = keyof typeof en;

export type Catalog = Record<TranslationKey, string>;

/** Base names of plural families, derived from the `_other` variants. */
export type PluralKey =
  TranslationKey extends infer Key
    ? Key extends `${infer Base}_other`
      ? Base
      : never
    : never;

export type TranslationVars = Record<string, string | number>;
