/**
 * Single source of truth for every filesystem path the framework uses.
 * Nothing else in the codebase should build paths from `import.meta.url`.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path of the repository root. */
export const ROOT_DIR = path.resolve(CURRENT_DIR, '..', '..');

/** Resolve a path relative to the repository root. */
export const fromRoot = (...segments) => path.join(ROOT_DIR, ...segments);

export const PATHS = Object.freeze({
  root: ROOT_DIR,
  framework: fromRoot('framework'),
  src: fromRoot('src'),
  tests: fromRoot('tests'),
  environments: fromRoot('config', 'environments'),

  // Generated output - all of it is git-ignored and wiped by `npm run clean`.
  reports: fromRoot('reports'),
  htmlReport: fromRoot('reports', 'html'),
  jsonReport: fromRoot('reports', 'json'),
  junitReport: fromRoot('reports', 'junit'),
  artifacts: fromRoot('reports', 'artifacts'),
  logs: fromRoot('reports', 'logs'),
  downloads: fromRoot('reports', 'downloads'),
  screenshots: fromRoot('reports', 'screenshots'),
  authState: fromRoot('.auth'),

  // Static assets committed with the repo (upload fixtures, PDFs, images...).
  uploads: fromRoot('assets', 'upload'),
});

/** Absolute path of a file inside `assets/upload` - used for file-upload tests. */
export const uploadAsset = (fileName) => path.join(PATHS.uploads, fileName);
