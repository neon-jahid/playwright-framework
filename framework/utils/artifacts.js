/**
 * Report attachments. Anything attached here shows up in the HTML report next
 * to the screenshot / video / trace Playwright collects automatically.
 */
import path from 'node:path';
import { PATHS } from './paths.js';
import { ensureDir, uniqueFileName } from './fileUtils.js';

/** Attaches a full-page screenshot and also saves it under reports/screenshots. */
export async function attachScreenshot(testInfo, page, name = 'screenshot') {
  if (page.isClosed?.()) return undefined;
  const filePath = path.join(ensureDir(PATHS.screenshots), uniqueFileName(`${name}.png`));
  const buffer = await page.screenshot({ path: filePath, fullPage: true }).catch(() => null);
  if (buffer) await testInfo.attach(name, { body: buffer, contentType: 'image/png' });
  return filePath;
}

export async function attachText(testInfo, name, content) {
  if (!content) return;
  await testInfo.attach(name, { body: String(content), contentType: 'text/plain' });
}

export async function attachJson(testInfo, name, data) {
  await testInfo.attach(name, { body: JSON.stringify(data, null, 2), contentType: 'application/json' });
}

export async function attachFile(testInfo, name, filePath, contentType = 'application/octet-stream') {
  await testInfo.attach(name, { path: filePath, contentType });
}

/** True when a test did not end in its expected state (failed / timed out). */
export const testFailed = (testInfo) => testInfo.status !== testInfo.expectedStatus;
