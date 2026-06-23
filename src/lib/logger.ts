import { db } from './db';
import * as Sentry from '@sentry/react';

export type LogLevel = 'info' | 'warn' | 'error' | 'success';
const MAX_LOGS = 200;

let writeCount = 0;

const SENTRY_LEVEL_MAP: Record<LogLevel, 'info' | 'warning' | 'error'> = {
  info: 'info',
  success: 'info',
  warn: 'warning',
  error: 'error',
};

export const log = async (msg: string, level: LogLevel = 'info', context?: string) => {
  // Dev console output with formatting
  if ((process.env.NODE_ENV === "development")) {
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(`[${context || 'App'}] ${msg}`);
  }

  // Add as Sentry breadcrumb for error context in production
  Sentry.addBreadcrumb({
    message: msg,
    level: SENTRY_LEVEL_MAP[level],
    category: context || 'app',
  });

  // Persist to IndexedDB
  try {
    await db.logs.add({ msg, level, context, time: Date.now() });
    writeCount++;
    
    // Only prune every 10 writes — amortizes the I/O cost
    if (writeCount % 10 === 0) {
      const count = await db.logs.count();
      if (count > MAX_LOGS) {
        const oldest = await db.logs.orderBy('time').limit(count - MAX_LOGS).primaryKeys();
        await db.logs.bulkDelete(oldest as number[]);
      }
    }
  } catch (e) {
    // Logging should never throw — swallow errors silently
    if ((process.env.NODE_ENV === "development")) console.warn('Failed to write to persistent logger:', e);
  }
};

const isDev = (process.env.NODE_ENV === "development");

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },

  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },

  warn: (...args: unknown[]) => {
    console.warn(...args);
  },

  error: (...args: unknown[]) => {
    console.error(...args);
  }
};

