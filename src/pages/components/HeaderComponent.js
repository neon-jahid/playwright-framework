import { BaseComponent } from '../../../framework/core/BaseComponent.js';

/**
 * Example component. Every locator inside is scoped to the header root, so the
 * same class can be reused on any page without selector collisions.
 *
 * The site renders its chrome as a <nav>; the other selectors are kept as
 * fallbacks so the component survives a markup change.
 */
export class HeaderComponent extends BaseComponent {
  constructor(page, deps = {}) {
    super(page, page.locator('header, [data-testid="site-header"], nav').first(), deps);

    this.eventsLink = this.getByRole('link', { name: /events/i });
    this.shopLink = this.getByRole('link', { name: /shop/i });

    // Only rendered for a signed-in user.
    this.userMenu = this.getByTestId('user-menu');
    this.logoutButton = this.getByRole('button', { name: /log ?out|sign ?out/i });
    this.searchInput = this.getByPlaceholder(/search/i);
  }

  async logout() {
    await this.clickIfVisible(this.userMenu);
    await this.click(this.logoutButton);
    return this;
  }

  async search(term) {
    await this.fill(this.searchInput, term);
    await this.pressKey(this.searchInput, 'Enter');
    return this;
  }
}
