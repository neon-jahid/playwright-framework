/**
 * Every element interaction the framework offers, in one place.
 *
 * It is scope-agnostic: the scope is a Page (BasePage) or a root Locator
 * (BaseComponent), and both expose the same locator API. That is what keeps
 * pages and components free of duplicated click/fill/wait helpers.
 *
 * All methods accept either a selector string or a Locator, so page objects can
 * expose readable locator properties and still use these helpers.
 */
import path from 'node:path';
import { expect } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts.js';
import { logger as rootLogger } from '../utils/logger.js';
import { retry } from '../utils/waitUtils.js';
import { uploadFilePath } from '../utils/fileUtils.js';

const MASKED = '********';

export class UiActions {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {{ scope?: object, logger?: object, name?: string }} [options]
   */
  constructor(page, options = {}) {
    this.page = page;
    this.scope = options.scope ?? page;
    this.logger = (options.logger ?? rootLogger).child(options.name ?? this.constructor.name);
  }

  // --- Locator builders ------------------------------------------------------

  /** Normalises a selector string or Locator into a Locator. */
  locator(target) {
    return typeof target === 'string' ? this.scope.locator(target) : target;
  }

  getByTestId(testId) {
    return this.scope.getByTestId(testId);
  }

  getByRole(role, options) {
    return this.scope.getByRole(role, options);
  }

  getByText(text, options) {
    return this.scope.getByText(text, options);
  }

  getByLabel(text, options) {
    return this.scope.getByLabel(text, options);
  }

  getByPlaceholder(text, options) {
    return this.scope.getByPlaceholder(text, options);
  }

  // --- Actions ---------------------------------------------------------------

  async click(target, options = {}) {
    this.logger.debug(`Click ${this.describe(target)}`);
    await this.locator(target).click(options);
    return this;
  }

  /** Click that survives re-rendering lists / overlays that eat the first attempt. */
  async safeClick(target, options = {}) {
    await retry(() => this.locator(target).click({ timeout: TIMEOUTS.SHORT, ...options }), {
      description: `click on ${this.describe(target)}`,
      log: this.logger,
    });
    return this;
  }

  /** Clicks only when the element is present - for optional cookie banners etc. */
  async clickIfVisible(target, timeout = TIMEOUTS.INSTANT) {
    const element = this.locator(target);
    if (await element.isVisible({ timeout }).catch(() => false)) {
      await element.click();
      return true;
    }
    return false;
  }

  async doubleClick(target, options = {}) {
    await this.locator(target).dblclick(options);
    return this;
  }

  async rightClick(target, options = {}) {
    await this.locator(target).click({ button: 'right', ...options });
    return this;
  }

  /** Fills an input. Pass { mask: true } to keep secrets out of the logs. */
  async fill(target, value, options = {}) {
    const { mask = false, ...fillOptions } = options;
    this.logger.debug(`Fill ${this.describe(target)} with "${mask ? MASKED : value}"`);
    await this.locator(target).fill(String(value ?? ''), fillOptions);
    return this;
  }

  /** Types character by character - only needed for inputs with key handlers. */
  async typeText(target, value, options = {}) {
    await this.locator(target).pressSequentially(String(value), { delay: 50, ...options });
    return this;
  }

  async clear(target) {
    await this.locator(target).clear();
    return this;
  }

  async check(target) {
    await this.locator(target).check();
    return this;
  }

  async uncheck(target) {
    await this.locator(target).uncheck();
    return this;
  }

  async selectOption(target, value) {
    this.logger.debug(`Select ${JSON.stringify(value)} in ${this.describe(target)}`);
    return this.locator(target).selectOption(value);
  }

  async hover(target) {
    await this.locator(target).hover();
    return this;
  }

  async pressKey(target, key) {
    await this.locator(target).press(key);
    return this;
  }

  async scrollIntoView(target) {
    await this.locator(target).scrollIntoViewIfNeeded();
    return this;
  }

  async dragTo(source, destination) {
    await this.locator(source).dragTo(this.locator(destination));
    return this;
  }

  /**
   * Uploads one or more files. Bare names resolve against assets/upload,
   * absolute paths are used as-is.
   */
  async uploadFile(target, files) {
    const paths = (Array.isArray(files) ? files : [files]).map((file) =>
      path.isAbsolute(file) ? file : uploadFilePath(file)
    );
    this.logger.step(`Upload ${paths.length} file(s) to ${this.describe(target)}`);
    await this.locator(target).setInputFiles(paths);
    return this;
  }

  // --- State readers ---------------------------------------------------------

  async getText(target) {
    return (await this.locator(target).innerText()).trim();
  }

  async getAllTexts(target) {
    return (await this.locator(target).allInnerTexts()).map((text) => text.trim());
  }

  async getAttribute(target, attribute) {
    return this.locator(target).getAttribute(attribute);
  }

  async getInputValue(target) {
    return this.locator(target).inputValue();
  }

  async count(target) {
    return this.locator(target).count();
  }

  async isVisible(target, timeout = TIMEOUTS.INSTANT) {
    return this.locator(target)
      .isVisible({ timeout })
      .catch(() => false);
  }

  async isEnabled(target) {
    return this.locator(target).isEnabled();
  }

  async isChecked(target) {
    return this.locator(target).isChecked();
  }

  // --- Waits -----------------------------------------------------------------

  async waitForVisible(target, timeout = TIMEOUTS.MEDIUM) {
    await this.locator(target).waitFor({ state: 'visible', timeout });
    return this;
  }

  async waitForHidden(target, timeout = TIMEOUTS.MEDIUM) {
    await this.locator(target).waitFor({ state: 'hidden', timeout });
    return this;
  }

  async waitForEnabled(target, timeout = TIMEOUTS.MEDIUM) {
    await expect(this.locator(target)).toBeEnabled({ timeout });
    return this;
  }

  // --- Assertions ------------------------------------------------------------
  // Thin wrappers so page objects can assert without importing expect().

  async expectVisible(target, timeout = TIMEOUTS.MEDIUM) {
    await expect(this.locator(target)).toBeVisible({ timeout });
    return this;
  }

  async expectHidden(target, timeout = TIMEOUTS.MEDIUM) {
    await expect(this.locator(target)).toBeHidden({ timeout });
    return this;
  }

  async expectText(target, expected, timeout = TIMEOUTS.MEDIUM) {
    await expect(this.locator(target)).toHaveText(expected, { timeout });
    return this;
  }

  async expectContainsText(target, expected, timeout = TIMEOUTS.MEDIUM) {
    await expect(this.locator(target)).toContainText(expected, { timeout });
    return this;
  }

  async expectValue(target, expected, timeout = TIMEOUTS.MEDIUM) {
    await expect(this.locator(target)).toHaveValue(expected, { timeout });
    return this;
  }

  async expectCount(target, expected, timeout = TIMEOUTS.MEDIUM) {
    await expect(this.locator(target)).toHaveCount(expected, { timeout });
    return this;
  }

  /** Readable identifier used in log lines. */
  describe(target) {
    return typeof target === 'string' ? target : String(target);
  }
}
