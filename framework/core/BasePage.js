/**
 * Base class for every page object.
 *
 * Provides navigation, page-level waits, downloads, dialogs and network helpers
 * on top of the shared element actions in UiActions. Page objects only declare
 * their locators plus their business methods.
 */
import path from 'node:path';
import { expect } from '@playwright/test';
import { UiActions } from './UiActions.js';
import { getConfig } from '../config/environment.js';
import { TIMEOUTS } from '../constants/timeouts.js';
import { downloadsDir, ensureDir, uniqueFileName } from '../utils/fileUtils.js';
import { PATHS } from '../utils/paths.js';

export class BasePage extends UiActions {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {{ logger?: object, config?: object }} [deps] injected by the `pages` fixture
   */
  constructor(page, deps = {}) {
    super(page, { logger: deps.logger, name: new.target.name });
    this.config = deps.config ?? getConfig();

    /** Route of this page relative to baseURL. Subclasses override it. */
    this.path = '/';

    /**
     * Locator that proves the page has rendered. Subclasses set it so
     * waitUntilLoaded()/isLoaded() work without extra code.
     */
    this.identifier = undefined;
  }

  /** Absolute URL of this page. */
  get url() {
    return new URL(this.path, this.config.baseURL).toString();
  }

  // --- Navigation ------------------------------------------------------------

  /** Opens the page (or an explicit path/URL) and waits until it is loaded. */
  async goto(target = this.path, options = {}) {
    this.logger.step(`Navigate to ${target}`);
    await this.page.goto(target, { waitUntil: 'domcontentloaded', ...options });
    return this.waitUntilLoaded();
  }

  async reload() {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    return this.waitUntilLoaded();
  }

  async goBack() {
    await this.page.goBack({ waitUntil: 'domcontentloaded' });
    return this;
  }

  /** Waits for the document plus this page's identifier locator, when defined. */
  async waitUntilLoaded(timeout = TIMEOUTS.LONG) {
    await this.page.waitForLoadState('domcontentloaded');
    if (this.identifier) await this.waitForVisible(this.identifier, timeout);
    return this;
  }

  /** Non-throwing variant - useful for conditional flows and assertions. */
  async isLoaded(timeout = TIMEOUTS.SHORT) {
    try {
      await this.waitUntilLoaded(timeout);
      return true;
    } catch {
      return false;
    }
  }

  async waitForUrl(urlPattern, timeout = TIMEOUTS.LONG) {
    await this.page.waitForURL(urlPattern, { timeout });
    return this;
  }

  async expectUrl(urlPattern, timeout = TIMEOUTS.LONG) {
    await expect(this.page).toHaveURL(urlPattern, { timeout });
    return this;
  }

  async expectTitle(titlePattern, timeout = TIMEOUTS.MEDIUM) {
    await expect(this.page).toHaveTitle(titlePattern, { timeout });
    return this;
  }

  get currentUrl() {
    return this.page.url();
  }

  async title() {
    return this.page.title();
  }

  // --- Page-level helpers ----------------------------------------------------

  /** Saves a screenshot under reports/screenshots and returns its path. */
  async screenshot(name = 'page', { fullPage = true } = {}) {
    const filePath = path.join(ensureDir(PATHS.screenshots), uniqueFileName(`${name}.png`));
    await this.page.screenshot({ path: filePath, fullPage });
    this.logger.debug(`Screenshot saved: ${filePath}`);
    return filePath;
  }

  /**
   * Runs an action that triggers a download and saves the file.
   * @returns {Promise<{ path: string, suggestedFilename: string }>}
   */
  async downloadFile(triggerAction, { saveAs } = {}) {
    const [download] = await Promise.all([this.page.waitForEvent('download'), triggerAction()]);
    const fileName = saveAs ?? download.suggestedFilename();
    const target = path.join(downloadsDir(), fileName);
    await download.saveAs(target);
    this.logger.step(`Downloaded ${fileName} -> ${target}`);
    return { path: target, suggestedFilename: download.suggestedFilename() };
  }

  /** Handles the next native dialog (alert / confirm / prompt). */
  async handleDialog({ accept = true, promptText } = {}) {
    this.page.once('dialog', async (dialog) => {
      this.logger.debug(`Dialog "${dialog.message()}" -> ${accept ? 'accept' : 'dismiss'}`);
      await (accept ? dialog.accept(promptText) : dialog.dismiss());
    });
    return this;
  }

  /** Runs an action and resolves with the matching API response. */
  async waitForResponse(urlPattern, triggerAction, { timeout = TIMEOUTS.LONG } = {}) {
    const [response] = await Promise.all([
      this.page.waitForResponse(urlPattern, { timeout }),
      triggerAction(),
    ]);
    return response;
  }

  /** Stubs a network call - keeps tests independent of unstable third parties. */
  async mockResponse(urlPattern, body, status = 200) {
    await this.page.route(urlPattern, (route) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    );
    return this;
  }
}
