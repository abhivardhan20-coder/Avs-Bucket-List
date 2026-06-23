import { NextResponse } from 'next/server';
// import { cleanupBlacklist } from '@/lib/server/blacklist';

export async function GET(req: Request) {
  // await cleanupBlacklist();
  return NextResponse.json({ ok: true, message: 'cron disabled' });
}
