/**
 * Example page object.
 *
 * Pattern to copy for every page:
 *   1. set `path` and `identifier` in the constructor,
 *   2. declare locators as readable properties,
 *   3. expose business actions and assertions - never raw Playwright calls in tests.
 */
import { BasePage } from '../../framework/core/BasePage.js';

export class LoginPage extends BasePage {
  constructor(page, deps) {
    super(page, deps);

    this.path = '/signin';

    // Locators - prefer user-facing selectors (role/label/placeholder) over CSS.
    // The credential fields are the only ones the form renders, and their name
    // attributes are stable, so they beat the Tailwind class soup around them.
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.loginButton = page.getByRole('button', { name: /log ?in/i });

    // Validation and credential errors render inline under the field they belong
    // to; `errorMessage` is the first of them, `errorMessages` is all of them.
    this.errorMessages = page.locator('p.text-red-500');
    this.errorMessage = this.errorMessages.first();

    this.forgotPasswordLink = page.getByText(/forge?t password/i);
    this.signUpLink = page.getByRole('link', { name: /sign ?up/i });

    // Proves the page rendered - used by waitUntilLoaded()/isLoaded().
    this.identifier = this.passwordInput;
  }

  /** @param {{ username: string, password: string }} user */
  async login(user) {
    this.logger.step(`Login as "${user.username}"`);
    await this.fill(this.usernameInput, user.username);
    await this.fill(this.passwordInput, user.password, { mask: true });
    await this.click(this.loginButton);
    return this;
  }

  /** Full happy path, including the redirect - used by the auth setup project. */
  async loginAndWaitForDashboard(user) {
    await this.login(user);
    await this.waitForUrl(/dashboard/i);
    return this;
  }

  async expectErrorMessage(expectedText) {
    await this.expectVisible(this.errorMessage);
    if (expectedText) await this.expectContainsText(this.errorMessage, expectedText);
    return this;
  }

  async expectOnLoginPage() {
    await this.expectUrl(/signin/i);
    await this.expectVisible(this.loginButton);
    return this;
  }

  async openRegistration() {
    await this.click(this.signUpLink);
    return this;
  }
}
