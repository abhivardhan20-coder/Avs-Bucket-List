import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized');
  const token = authHeader.slice(7);
  const secret = process.env.SUPABASE_JWT_SECRET?.split(',')[0] || process.env.JWT_SECRET!;
  return jwt.verify(token, secret) as any;
}
