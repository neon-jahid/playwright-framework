/** Filesystem helpers for uploads, downloads and generated artifacts. */
import fs from 'node:fs';
import path from 'node:path';
import { PATHS, uploadAsset } from './paths.js';

export const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
};

export const exists = (targetPath) => fs.existsSync(targetPath);

export const readText = (filePath) => fs.readFileSync(filePath, 'utf8');

export const readJson = (filePath) => JSON.parse(readText(filePath));

export const writeText = (filePath, content) => {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
};

export const writeJson = (filePath, data) => writeText(filePath, JSON.stringify(data, null, 2));

export const removeFile = (filePath) => {
  if (exists(filePath)) fs.rmSync(filePath, { force: true });
};

export const cleanDir = (dirPath) => {
  fs.rmSync(dirPath, { recursive: true, force: true });
  return ensureDir(dirPath);
};

export const listFiles = (dirPath, extension) =>
  (exists(dirPath) ? fs.readdirSync(dirPath) : [])
    .filter((file) => !extension || file.endsWith(extension))
    .map((file) => path.join(dirPath, file));

/** Age of a file in minutes; Infinity when it does not exist. */
export const fileAgeInMinutes = (filePath) =>
  exists(filePath) ? (Date.now() - fs.statSync(filePath).mtimeMs) / 60_000 : Infinity;

/** report.pdf -> report-1712345678901.pdf (collision-free artifact names). */
export const uniqueFileName = (fileName) => {
  const extension = path.extname(fileName);
  return `${path.basename(fileName, extension)}-${Date.now()}${extension}`;
};

/** Absolute path to a committed upload asset (assets/upload/<name>). */
export const uploadFilePath = (fileName) => {
  const filePath = uploadAsset(fileName);
  if (!exists(filePath)) {
    throw new Error(`Upload asset "${fileName}" not found at ${filePath}. Add it to assets/upload/.`);
  }
  return filePath;
};

/** Directory downloads are saved into (reports/downloads). */
export const downloadsDir = () => ensureDir(PATHS.downloads);
