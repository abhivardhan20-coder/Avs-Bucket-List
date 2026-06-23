import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getAuthenticatedUser } from '@/lib/server/authMiddleware';

export async function POST(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    const secret = process.env.SUPABASE_JWT_SECRET?.split(',')[0] || process.env.JWT_SECRET;
    if (!secret) return NextResponse.json({ error: "Server configuration error" }, { status: 500 });

    const newToken = jwt.sign({
      sub: user.sub,
      email: user.email,
      role: user.role,
      aud: user.aud
    }, secret, { expiresIn: '1h' });

    return NextResponse.json({ session: { access_token: newToken, expires_in: 3600 } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
