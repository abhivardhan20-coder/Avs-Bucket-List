import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

// Zod validation schema for path parameter
const QuerySchema = z.object({
  path: z.string().regex(new RegExp('^\\/[a-zA-Z0-9/\\-_]+$'))
})

// Per-User rate limiting: 60 requests per minute
const RATE_LIMIT = 60
const RATE_WINDOW_MS = 60_000

const kv = await Deno.openKv()

async function isRateLimited(userId: string): Promise<boolean> {
  const key = ['rate', userId]
  const entry = await kv.get<{ count: number; windowStart: number }>(key)
  const now = Date.now()

  if (!entry.value || now - entry.value.windowStart > RATE_WINDOW_MS) {
    // New window
    await kv.set(key, { count: 1, windowStart: now }, { expireIn: RATE_WINDOW_MS })
    return false
  }

  if (entry.value.count >= RATE_LIMIT) {
    return true
  }

  // Increment counter
  await kv.set(key, { count: entry.value.count + 1, windowStart: entry.value.windowStart }, {
    expireIn: RATE_WINDOW_MS - (now - entry.value.windowStart),
  })
  return false
}

serve(async (req) => {
  const requestId = crypto.randomUUID()
  const startTime = performance.now()
  const origin = req.headers.get('origin') ?? ''
  
  // Whitelist CORS origins
  const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') ?? [
    'http://localhost:3000',
    'https://avbucketlist.app'
  ]
  const isLocalhost = /^http:\/\/localhost(:\d+)?$/.test(origin)
  const isAllowed = isLocalhost || allowedOrigins.includes(origin)

  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
    'x-request-id': requestId,
  }

  // Reject forbidden CORS origins
  if (origin && !isAllowed) {
    console.warn(JSON.stringify({ requestId, error: 'CORS Forbidden', origin }))
    return new Response(JSON.stringify({ error: 'CORS Forbidden' }), {
      status: 403,
      headers: corsHeaders,
    })
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' } })
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Verify caller has an Authorization header (JWT)
  const auth = req.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Bearer token required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Verify token via Supabase Auth
  const token = auth.substring(7)
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    console.warn(JSON.stringify({ requestId, error: 'Unauthorized: Invalid token', details: authError }))
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Per-User rate limiting
  if (await isRateLimited(user.id)) {
    console.warn(JSON.stringify({ requestId, userId: user.id, error: 'Rate limit exceeded' }))
    return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': '60',
      },
    })
  }

  try {
    const url = new URL(req.url)
    const tmdbPath = url.searchParams.get('path') ?? '/trending/all/week'

    // Zod validation for TMDB path
    const validation = QuerySchema.safeParse({ path: tmdbPath })
    if (!validation.success) {
      console.warn(JSON.stringify({ requestId, userId: user.id, error: 'Invalid path format', path: tmdbPath }))
      return new Response(JSON.stringify({ error: 'Invalid path format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build upstream TMDB URL
    const upstream = new URL(`https://api.themoviedb.org/3${tmdbPath}`)

    // Pass through ALL query params from the client (except `path`)
    for (const [key, value] of url.searchParams.entries()) {
      if (key === 'path') continue
      upstream.searchParams.set(key, value)
    }

    // Inject the TMDB API key from server-side secret — never from client
    const tmdbKey = Deno.env.get('TMDB_KEY')
    if (!tmdbKey) {
      console.error(JSON.stringify({ requestId, error: 'TMDB_KEY not configured on server' }))
      return new Response(JSON.stringify({ error: 'TMDB_KEY not configured on server' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    upstream.searchParams.set('api_key', tmdbKey)

    // Set 8-second timeout for the upstream fetch request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    try {
      const res = await fetch(upstream.toString(), {
        headers: { accept: 'application/json' },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const durationMs = performance.now() - startTime
      console.info(JSON.stringify({
        requestId,
        userId: user.id,
        path: tmdbPath,
        status: res.status,
        durationMs,
      }))

      if (!res.ok) {
        const body = await res.text()
        return new Response(body, {
          status: res.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        })
      }

      const data = await res.json()
      return Response.json(data, {
        headers: {
          ...corsHeaders,
          'Cache-Control': 'public, max-age=300',
        },
      })
    } catch (fetchErr) {
      clearTimeout(timeoutId)
      if (fetchErr.name === 'AbortError') {
        console.error(JSON.stringify({ requestId, userId: user.id, error: 'TMDB request timed out' }))
        return new Response(JSON.stringify({ error: 'Gateway Timeout: TMDB response timed out' }), {
          status: 504,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      throw fetchErr
    }
  } catch (err) {
    console.error(JSON.stringify({ requestId, error: 'Internal server error', details: String(err) }))
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
