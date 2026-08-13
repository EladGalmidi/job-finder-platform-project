import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,

      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // The plan forbids `any`. Enforce it rather than trusting review.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
          // `typeof import('...')` is how the router types its lazy page keys.
          disallowTypeAnnotations: false,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      /*
       * Deliberate relaxations of strictTypeChecked, each for a concrete reason.
       */

      // Redux Toolkit's createSlice reducers mutate their draft by design, and
      // draft types defeat the rule's reachability analysis.
      '@typescript-eslint/no-unnecessary-condition': 'off',

      // Bracket access on Record<string, T> is intentional: it signals a dynamic
      // key rather than a known property.
      '@typescript-eslint/dot-notation': 'off',

      // `async (_: void)` is RTK's convention for a thunk that takes no argument
      // and is what allows `dispatch(thunk())` without passing undefined.
      '@typescript-eslint/no-invalid-void-type': 'off',

      // Normalised entity maps are removed from with `delete state.entities[id]`.
      '@typescript-eslint/no-dynamic-delete': 'off',

      // `onClick={() => dispatch(action())}` is idiomatic React; requiring braces
      // on every handler adds noise without catching bugs.
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
    },
  },

  /*
   * Architectural boundary, mechanically enforced.
   *
   * Phase 1 requirement: "Components must NOT directly import mock data."
   * The mock layer is reachable only through services/api -> transport. Anything
   * in the UI tree that imports from @/mocks is a build failure, not a review note.
   */
  {
    files: ['src/features/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}'],
    // The dev panel exists to drive the mock layer and is excluded from production
    // builds. It is the single sanctioned exception.
    ignores: ['src/features/dev/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/mocks', '@/mocks/*', '**/mocks/*', '../**/mocks/**'],
              message:
                'UI code must not import the mock layer. Go through @/services/api instead — the mock is a transport detail and disappears when VITE_API_MODE=live.',
            },
          ],
        },
      ],
    },
  },

  // The mock layer and tests are allowed to reach for anything.
  {
    files: ['src/mocks/**/*.ts', 'src/test/**/*.ts', 'src/**/*.{test,spec}.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  {
    files: ['vite.config.ts'],
    languageOptions: { globals: globals.node },
    rules: { '@typescript-eslint/no-unsafe-assignment': 'off' },
  },

  // Config files are not part of the TS project, so type-aware rules cannot run
  // on them.
  {
    files: ['**/*.js'],
    languageOptions: { globals: globals.node },
    extends: [tseslint.configs.disableTypeChecked],
  },
);
