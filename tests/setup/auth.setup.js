/**
 * Authentication setup project.
 *
 * Runs once before the UI projects, signs every configured role in through the
 * UI and stores the session in .auth/<env>-<role>.json. Specs then reuse it via
 * `test.use({ storageState: authState('standard') })` or the `loginAs` fixture,
 * so no test ever pays for a login again.
 *
 * Sessions younger than AUTH_MAX_AGE_MINUTES are reused as-is.
 * Force a refresh with: npm run auth:refresh
 */
import { test as setup } from '../../src/fixtures.js';
import { createAuthState } from '../../framework/index.js';
import { LoginPage } from '../../src/pages/index.js';

setup('authenticate all configured roles', async ({ browser, config, logger }) => {
  setup.setTimeout(120_000);

  const roles = Object.values(config.users).filter((user) => user.username && user.password);

  if (roles.length === 0) {
    logger.warn('No credentials configured - skipping authentication setup.');
    setup.skip(true, 'Define <ROLE>_USERNAME / <ROLE>_PASSWORD to enable session reuse.');
    return;
  }

  for (const { role } of roles) {
    await createAuthState({
      browser,
      role,
      force: config.forceAuthRefresh,
      // The only project-specific part: how this application logs in.
      login: async (page, user) => {
        const loginPage = new LoginPage(page, { config, logger });
        await loginPage.goto();
        await loginPage.loginAndWaitForDashboard(user);
      },
    });
  }
});
