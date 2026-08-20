/**
 * Public surface of the framework. Project code should import from here
 * (or from src/fixtures.js for `test`/`expect`) and never reach into
 * framework internals.
 */
export { test, expect, withPageObjects } from './fixtures/index.js';
export { BasePage } from './core/BasePage.js';
export { BaseComponent } from './core/BaseComponent.js';
export { UiActions } from './core/UiActions.js';
export { ApiClient } from './api/ApiClient.js';
export { getConfig, getUser, resetConfigCache, SUPPORTED_ENVIRONMENTS } from './config/environment.js';
export {
  authState,
  anonymousState,
  clearAuthState,
  createAuthState,
  isAuthStateFresh,
  storageStatePath,
  tokenFromAuthState,
} from './auth/authManager.js';
export { logger, Logger } from './utils/logger.js';
export { dataFactory } from './utils/dataFactory.js';
export { TIMEOUTS, RETRY } from './constants/timeouts.js';
export { PATHS, fromRoot, uploadAsset } from './utils/paths.js';
export { retry, sleep, waitFor, waitForStable } from './utils/waitUtils.js';
export { attachFile, attachJson, attachScreenshot, attachText, testFailed } from './utils/artifacts.js';
export {
  cleanDir,
  downloadsDir,
  ensureDir,
  exists,
  fileAgeInMinutes,
  listFiles,
  readJson,
  readText,
  removeFile,
  uniqueFileName,
  uploadFilePath,
  writeJson,
  writeText,
} from './utils/fileUtils.js';
