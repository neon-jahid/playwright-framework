/**
 * Generic Playwright fixtures. Nothing here is project-specific: a project
 * plugs in its page objects through withPageObjects() (see src/fixtures.js).
 *
 * Available fixtures:
 *   config    - validated environment configuration
 *   logger    - scoped logger; its output is attached to failed tests
 *   pages     - lazy page-object registry (pages.loginPage, pages.dashboardPage)
 *   data      - test data factory (faker based)
 *   api       - ApiClient bound to API_BASE_URL
 *   loginAs   - opens a page authenticated as a role via stored storageState
 */
import { test as base, expect } from '@playwright/test';
import { getConfig } from '../config/environment.js';
import { ApiClient } from '../api/ApiClient.js';
import { storageStatePath } from '../auth/authManager.js';
import { dataFactory } from '../utils/dataFactory.js';
import { logger as rootLogger } from '../utils/logger.js';
import { exists } from '../utils/fileUtils.js';
import { attachText, testFailed } from '../utils/artifacts.js';
import { createPageRegistry } from './pageRegistry.js';

export const test = base.extend({
  /** Page object classes injected by the project. */
  pageObjects: [{}, { option: true }],

  config: [
    async ({}, use) => {
      await use(getConfig());
    },
    { scope: 'worker' },
  ],

  data: [
    async ({}, use) => {
      await use(dataFactory);
    },
    { scope: 'worker' },
  ],

  logger: async ({}, use, testInfo) => {
    const testLogger = rootLogger.child(testInfo.title).reset();
    await use(testLogger);
  },

  /**
   * Auto fixture: brackets every test with a log line and attaches the captured
   * log to the report when the test fails. It deliberately does not depend on
   * `page`, so API-only projects never launch a browser.
   */
  testLifecycle: [
    async ({ logger }, use, testInfo) => {
      logger.info(`TEST START | ${testInfo.titlePath.join(' > ')} | project=${testInfo.project.name}`);
      await use();
      const outcome = testFailed(testInfo) ? 'FAILED' : 'PASSED';
      logger.info(`TEST ${outcome} | ${testInfo.title} | ${testInfo.duration}ms`);
      if (testFailed(testInfo)) await attachText(testInfo, 'test-log.txt', logger.dump());
    },
    { auto: true },
  ],

  /** Captures browser console errors and attaches them to failed tests. */
  page: async ({ page }, use, testInfo) => {
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(`[pageerror] ${error.message}`));

    await use(page);

    if (testFailed(testInfo) && consoleErrors.length > 0) {
      await attachText(testInfo, 'browser-console-errors.txt', consoleErrors.join('\n'));
    }
  },

  pages: async ({ page, pageObjects, config, logger }, use) => {
    await use(createPageRegistry(pageObjects, page, { config, logger }));
  },

  api: async ({ playwright, config, logger }, use) => {
    const context = await playwright.request.newContext({
      baseURL: config.apiBaseURL,
      ignoreHTTPSErrors: config.ignoreHTTPSErrors,
      timeout: config.timeouts.navigation,
    });
    await use(new ApiClient(context, { baseURL: config.apiBaseURL, token: config.apiToken, logger }));
    await context.dispose();
  },

  /**
   * Opens an authenticated page for a role, reusing the stored session:
   *   const adminPage = await loginAs('admin');
   * Contexts are closed automatically at the end of the test.
   */
  loginAs: async ({ browser, config }, use) => {
    const contexts = [];

    const open = async (role = 'standard', contextOptions = {}) => {
      const statePath = storageStatePath(role);
      if (!exists(statePath)) {
        throw new Error(
          `No stored session for role "${role}" (${statePath}). ` +
            `Run the "setup" project first, or check that ${role.toUpperCase()}_USERNAME is defined.`
        );
      }
      const context = await browser.newContext({
        storageState: statePath,
        baseURL: config.baseURL,
        ...contextOptions,
      });
      contexts.push(context);
      return context.newPage();
    };

    await use(open);
    await Promise.all(contexts.map((context) => context.close()));
  },
});

/** Binds a project's page objects to the framework fixtures. */
export const withPageObjects = (pageObjects) => test.extend({ pageObjects: [pageObjects, { option: true }] });

export { expect };
