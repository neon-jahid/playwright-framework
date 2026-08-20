/**
 * Example UI spec.
 *
 * Note what is NOT here: no page-object imports, no `new LoginPage(page)`, no
 * credentials, no waits. Tests describe behaviour; everything else is a fixture.
 */
import { test, expect } from '../../src/fixtures.js';
import { invalidUser, messages } from '../../src/data/index.js';
import { anonymousState } from '../../framework/index.js';

// Login must start from a clean session, whatever the project default is.
test.use({ storageState: anonymousState });

test.describe('Login', { tag: ['@smoke', '@auth'] }, () => {
  test.beforeEach(async ({ pages }) => {
    await pages.loginPage.goto();
  });

  test('valid user can sign in', { tag: '@critical' }, async ({ pages, config }) => {
    await pages.loginPage.login(config.users.standard);

    await expect(pages.loginPage.page).toHaveURL(/dashboard/i);
  });

  test('invalid credentials are rejected', async ({ pages }) => {
    await pages.loginPage.login(invalidUser);

    await pages.loginPage.expectErrorMessage(messages.login.invalidCredentials);
    await pages.loginPage.expectOnLoginPage();
  });

  test('password is not exposed in the DOM', async ({ pages }) => {
    await expect(pages.loginPage.passwordInput).toHaveAttribute('type', 'password');
  });
});
