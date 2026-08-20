import { BasePage } from '../../framework/core/BasePage.js';

export class RegistrationPage extends BasePage {
  constructor(page, deps) {
    super(page, deps);

    this.path = '/signup';

    this.fullNameInput = page.locator('input[name="full_name"]');
    this.emailInput = page.locator('input[name="email"]');
    this.phoneInput = page.locator('input[name="phone"]');
    this.dateOfBirthInput = page.locator('input[name="dob"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    this.submitButton = page.getByRole('button', { name: /sign ?up/i });

    // The app confirms with a toast (react-toastify) and reports field problems
    // inline, so success and failure have different homes.
    this.successToast = page.locator('.Toastify__toast--success');
    this.errorToast = page.locator('.Toastify__toast--error');
    this.errorMessages = page.locator('p.text-red-500');
    this.errorMessage = this.errorMessages.first();

    this.identifier = this.fullNameInput;
  }

  /**
   * Accepts anything `registrationData()` produces, so callers override only
   * what the test is about:
   *   register(registrationData(data, { confirmPassword: 'mismatch' }))
   */
  async register(user) {
    this.logger.step(`Register "${user.email}"`);
    await this.fill(this.fullNameInput, user.fullName);
    await this.fill(this.emailInput, user.email);
    await this.fill(this.phoneInput, user.phone);
    await this.fill(this.dateOfBirthInput, user.dateOfBirth); // input[type=date] wants YYYY-MM-DD
    await this.fill(this.passwordInput, user.password, { mask: true });
    await this.fill(this.confirmPasswordInput, user.confirmPassword, { mask: true });
    await this.click(this.submitButton);
    return this;
  }

  async expectRegistrationSucceeded() {
    await this.expectVisible(this.successToast);
    return this;
  }

  async expectRegistrationFailed(expectedText) {
    await this.expectVisible(this.errorMessage);
    if (expectedText) await this.expectContainsText(this.errorMessage, expectedText);
    return this;
  }
}
