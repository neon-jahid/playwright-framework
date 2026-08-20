/**
 * Dependency-free structured logger.
 *
 * - Level is driven by LOG_LEVEL (error | warn | info | debug).
 * - Every line is tagged with the worker index so parallel runs stay readable.
 * - Optionally mirrors output to reports/logs/test-run.log (LOG_TO_FILE).
 * - `child(scope)` gives page objects / tests their own prefix for free.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from './paths.js';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const COLORS = {
  error: '\x1b[31m',
  warn: '\x1b[33m',
  info: '\x1b[36m',
  debug: '\x1b[90m',
  reset: '\x1b[0m',
};

const LOG_FILE = path.join(PATHS.logs, 'test-run.log');
const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

let fileLoggingChecked = false;
let fileLoggingEnabled = false;

function canWriteToFile() {
  if (fileLoggingChecked) return fileLoggingEnabled;
  fileLoggingChecked = true;
  fileLoggingEnabled = String(process.env.LOG_TO_FILE ?? 'true').toLowerCase() !== 'false';
  if (fileLoggingEnabled) {
    try {
      fs.mkdirSync(PATHS.logs, { recursive: true });
    } catch {
      fileLoggingEnabled = false; // never let logging break a test run
    }
  }
  return fileLoggingEnabled;
}

const activeLevel = () => LEVELS[String(process.env.LOG_LEVEL || 'info').toLowerCase()] ?? LEVELS.info;

const workerTag = () =>
  process.env.TEST_WORKER_INDEX !== undefined ? `w${process.env.TEST_WORKER_INDEX}` : 'main';

function formatMeta(meta) {
  if (meta === undefined || meta === null) return '';
  if (meta instanceof Error) return ` ${meta.stack || meta.message}`;
  if (typeof meta === 'string') return ` ${meta}`;
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ` ${String(meta)}`;
  }
}

export class Logger {
  constructor(scope = 'framework') {
    this.scope = scope;
    /** Lines captured for the current test - attached to the report on failure. */
    this.buffer = [];
  }

  /** Creates a nested logger, e.g. logger.child('LoginPage'). */
  child(scope) {
    const child = new Logger(this.scope === 'framework' ? scope : `${this.scope}:${scope}`);
    child.buffer = this.buffer; // share the buffer so nested logs are reported together
    return child;
  }

  error(message, meta) {
    this.write('error', message, meta);
  }

  warn(message, meta) {
    this.write('warn', message, meta);
  }

  info(message, meta) {
    this.write('info', message, meta);
  }

  debug(message, meta) {
    this.write('debug', message, meta);
  }

  /** Highlights a business-level action inside the log stream. */
  step(message, meta) {
    this.write('info', `> ${message}`, meta);
  }

  /** Drops buffered lines (called between tests by the logger fixture). */
  reset() {
    this.buffer.length = 0;
    return this;
  }

  /** Buffered lines as plain text - used for report attachments. */
  dump() {
    return this.buffer.join('\n');
  }

  write(level, message, meta) {
    const timestamp = new Date().toISOString();
    const line = `${timestamp} [${workerTag()}] ${level.toUpperCase().padEnd(5)} [${this.scope}] ${message}${formatMeta(meta)}`;
    this.buffer.push(line);

    if (LEVELS[level] <= activeLevel()) {
      const painted = useColor ? `${COLORS[level]}${line}${COLORS.reset}` : line;
      console[level === 'debug' ? 'log' : level](painted);
    }

    if (canWriteToFile()) {
      try {
        fs.appendFileSync(LOG_FILE, `${line}\n`);
      } catch {
        /* logging must never fail a test */
      }
    }
  }
}

/** Shared root logger. Prefer logger.child('Scope') over using this directly. */
export const logger = new Logger();
