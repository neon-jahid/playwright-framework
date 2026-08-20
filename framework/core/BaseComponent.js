/**
 * Base class for reusable UI components (header, nav, modal, table row...).
 *
 * A component scopes every action to its root locator, so the same class works
 * for repeated elements: new ProductCard(page, page.locator('.card').nth(2)).
 */
import { UiActions } from './UiActions.js';
import { TIMEOUTS } from '../constants/timeouts.js';

export class BaseComponent extends UiActions {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {string|import('@playwright/test').Locator} root component root
   * @param {{ logger?: object }} [deps]
   */
  constructor(page, root, deps = {}) {
    const rootLocator = typeof root === 'string' ? page.locator(root) : root;
    super(page, { scope: rootLocator, logger: deps.logger, name: new.target.name });
    this.root = rootLocator;
  }

  async waitUntilVisible(timeout = TIMEOUTS.MEDIUM) {
    await this.root.waitFor({ state: 'visible', timeout });
    return this;
  }

  async isPresent(timeout = TIMEOUTS.INSTANT) {
    return this.root.isVisible({ timeout }).catch(() => false);
  }

  async expectPresent(timeout = TIMEOUTS.MEDIUM) {
    return this.expectVisible(this.root, timeout);
  }

  /** Nth instance of this component, e.g. table rows. */
  nth(index) {
    return new this.constructor(this.page, this.root.nth(index), { logger: this.logger });
  }
}
