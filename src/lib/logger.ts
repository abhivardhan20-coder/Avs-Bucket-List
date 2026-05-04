import { db } from './db';

export type LogLevel = 'info' | 'warn' | 'error' | 'success';
const MAX_LOGS = 200;

let writeCount = 0;

export const log = async (msg: string, level: LogLevel = 'info', context?: string) => {
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
    console.warn("Failed to write to persistent logger:", e);
  }
};
