import { BasePage } from '../../framework/core/BasePage.js';
import { HeaderComponent } from './components/HeaderComponent.js';

/** Example of a page that composes a reusable component. */
export class DashboardPage extends BasePage {
  constructor(page, deps) {
    super(page, deps);

    this.path = '/dashboard';
    this.welcomeBanner = page.locator('[data-testid="welcome-banner"], .welcome');

    // No identifier: /dashboard bounces anonymous visitors to /signin, so the
    // URL is what proves we got in. expectLoaded() asserts exactly that.
    this.identifier = undefined;

    /** Shared site chrome, reused by every authenticated page. */
    this.header = new HeaderComponent(page, deps);
  }

  async expectLoaded() {
    await this.expectUrl(/dashboard/i);
    await this.header.expectPresent();
    return this;
  }

  /** True when the app redirected us back to the sign-in page. */
  async isSignedOut() {
    return /signin/i.test(this.currentUrl);
  }

  async logout() {
    await this.header.logout();
    return this;
  }
}
