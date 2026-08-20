/**
 * Example of an authenticated spec plus the full set of hooks.
 *
 * The session is reused from the `setup` project, so this file never logs in.
 */
import { test, expect } from '../../src/fixtures.js';
import { authState, exists, storageStatePath } from '../../framework/index.js';

// Everything in this file runs as the standard user.
test.use({ storageState: authState('standard') });

test.describe('Dashboard', { tag: ['@regression', '@auth'] }, () => {
  test.beforeAll(async ({ logger }) => {
    // Keeps the example suite green when no credentials are configured yet.
    test.skip(
      !exists(storageStatePath('standard')),
      'No stored session. Configure STANDARD_USERNAME / STANDARD_PASSWORD and run the setup project.'
    );
    logger.info('Dashboard suite starting - session reused from the setup project');
  });

  test.beforeEach(async ({ pages }) => {
    await pages.dashboardPage.goto();
  });

  test.afterEach(async ({ logger }, testInfo) => {
    logger.debug(`Finished "${testInfo.title}" with status ${testInfo.status}`);
  });

  test.afterAll(async ({ logger }) => {
    logger.info('Dashboard suite finished');
  });

  test('opens for an authenticated user', { tag: '@smoke' }, async ({ pages }) => {
    await pages.dashboardPage.expectLoaded();
  });

  test('header search accepts a query', async ({ pages }) => {
    await pages.dashboardPage.header.search('playwright');

    await expect(pages.dashboardPage.page).toHaveURL(/search|q=/i);
  });

  // Multi-role in a single test: each role gets its own isolated context.
  test(
    'admin session is independent of the standard session',
    { tag: '@multi-role' },
    async ({ loginAs, config }) => {
      test.skip(!config.users.admin?.password, 'No admin credentials configured');

      const adminPage = await loginAs('admin');
      await adminPage.goto('/dashboard');

      await expect(adminPage).toHaveURL(/dashboard/i);
    }
  );
});
