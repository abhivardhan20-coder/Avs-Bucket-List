---
name: TMDB fetch strategy
description: How safeTmdbFetch works and why dev mode skips the Edge Function
---

## Rule
In `artifacts/bucket-list/src/services/tmdb.ts`, `safeTmdbFetch` has two paths:

- **DEV** (`import.meta.env.DEV`): Goes directly to TMDB API using `VITE_TMDB_API_KEY`. No Edge Function. This is intentional to avoid 5-10s latency from a non-deployed Edge Function returning 404.
- **PROD**: Tries Supabase Edge Function first, falls back to direct TMDB on ANY non-OK response (including 404 = function not deployed).

**Why:** The original code had `if (response.status === 404) return null` before the TMDB fallback. When the Edge Function doesn't exist, Supabase returns 404, which caused `null` to be returned for every TMDB call → all content rows empty/hidden → appeared as "infinite loading".

**How to apply:** Do NOT add an early `return null` for 404 on the Edge Function path. The 404 null return should only be in the direct TMDB path (item genuinely not found).
