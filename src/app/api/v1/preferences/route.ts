import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/authMiddleware';
import { PreferencesService } from '@/lib/server/PreferencesService';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    const prefs = await PreferencesService.getPreferences(user.sub);
    return NextResponse.json(prefs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode ?? 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    const body = await req.json();
    const prefs = await PreferencesService.updatePreferences(user.sub, body);
    return NextResponse.json(prefs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode ?? 500 });
  }
}
