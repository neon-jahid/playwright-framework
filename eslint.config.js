import js from '@eslint/js';
import globals from 'globals';
import playwright from 'eslint-plugin-playwright';

export default [
  {
    ignores: ['node_modules/**', 'reports/**', 'test-results/**', 'playwright-report/**', '.auth/**'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-empty-pattern': 'off', // Playwright fixtures legitimately use ({}, use)
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
    },
  },
  {
    files: ['tests/**/*.js'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Page objects own their assertions (pages.loginPage.expectErrorMessage()),
      // so the rule has to look past a bare expect() call in the spec.
      'playwright/expect-expect': ['warn', { assertFunctionPatterns: ['^expect'] }],
      // test.skip(condition, reason) is how the suite guards optional roles/data.
      'playwright/no-skipped-test': ['warn', { allowConditional: true }],
    },
  },
  {
    // Setup projects prepare state instead of asserting, and branch on which
    // roles the active environment actually configures.
    files: ['tests/setup/**/*.js'],
    rules: {
      'playwright/expect-expect': 'off',
      'playwright/no-conditional-in-test': 'off',
    },
  },
];
