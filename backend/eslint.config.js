import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'drizzle/**'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        // This config file is not in tsconfig's include, so the project service
        // needs it named explicitly or linting the repo root fails.
        projectService: { allowDefaultProject: ['eslint.config.js'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Structured errors carry a code; a bare string throw cannot be handled
      // by a caller and cannot be mapped to a response.
      'no-throw-literal': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      // Reading process.env outside config/env.ts defeats fail-fast validation.
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Read configuration from config/env.ts, which validates it at startup.',
        },
      ],
    },
  },
  {
    // The config module is the one place allowed to touch process.env.
    files: ['src/config/env.ts', 'src/main.ts', 'drizzle.config.ts'],
    rules: { 'no-restricted-properties': 'off' },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Tests read DATABASE_URL directly so CI can point them at its own
      // instance without going through the server's startup validation.
      'no-restricted-properties': 'off',
    },
  },
);
