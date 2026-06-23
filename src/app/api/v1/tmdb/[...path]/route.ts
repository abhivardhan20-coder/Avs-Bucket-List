import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/authMiddleware';
// Assuming you have a tmdb proxy or fetcher logic here, simplified for migration
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    // getAuthenticatedUser(req); // Optional auth check
    const { path } = await params;
    const searchParams = req.nextUrl.searchParams;
    const pathStr = path.join('/');
    const tmdbUrl = new URL(`${TMDB_BASE_URL}/${pathStr}`);
    searchParams.forEach((val, key) => tmdbUrl.searchParams.append(key, val));
    tmdbUrl.searchParams.append('api_key', process.env.TMDB_API_KEY!);

    const res = await fetch(tmdbUrl.toString());
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
