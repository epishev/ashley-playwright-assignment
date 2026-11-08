// @ts-check
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

// The project's rules (see CLAUDE.md) are errors, wherever Playwright code lives.
const projectRules = {
  'playwright/missing-playwright-await': 'error',
  'playwright/no-focused-test': 'error',
  'playwright/no-skipped-test': 'error',
  'playwright/no-wait-for-timeout': 'error',
  'playwright/no-networkidle': 'error',
  'playwright/no-force-option': 'error',
  'playwright/no-element-handle': 'error',
  'playwright/no-wait-for-selector': 'error',
  'playwright/prefer-web-first-assertions': 'error',
  'playwright/valid-expect': 'error',
};

export default defineConfig([
  globalIgnores(['playwright-report/', 'test-results/', 'blob-report/', 'allure-results/', 'allure-report/']),
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
  },
  {
    // Plain JavaScript config files are not part of the TypeScript project.
    files: ['**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['tests/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
    rules: {
      ...projectRules,
      // Assertions live in the page objects as expect... methods, so calling one counts as an assertion.
      'playwright/expect-expect': ['error', { assertFunctionPatterns: ['^expect'] }],
    },
  },
  {
    // Page objects and fixtures hold the assertions, outside test blocks, so only the rules above apply there.
    files: ['pages/**/*.ts', 'fixtures/**/*.ts', 'controllers/**/*.ts'],
    plugins: { playwright },
    rules: projectRules,
  },
]);
