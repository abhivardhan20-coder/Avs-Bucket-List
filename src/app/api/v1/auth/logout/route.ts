import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/server/AuthService';
import { getAuthenticatedUser } from '@/lib/server/authMiddleware';

export async function POST(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    const authHeader = req.headers.get('authorization')!;
    const result = await AuthService.logout(authHeader, user.sub);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode ?? 401 });
  }
}
