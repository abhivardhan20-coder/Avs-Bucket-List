# AV's Bucket List

A personal movie and TV show tracker with Supabase sync and Google OAuth. Track your watchlist, watched titles, upcoming releases, and stats — with offline-first Dexie.js storage and real-time Supabase sync.

## Run & Operate

- `pnpm --filter @workspace/bucket-list run dev` — run the frontend (port auto-assigned via workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7 + Tailwind CSS v4 + React Router v7
- Auth: Google OAuth via `@react-oauth/google` + Supabase Auth
- DB: Supabase (remote sync) + Dexie.js (offline-first IndexedDB)
- API sources: TMDB, Trakt, TheTVDB, Fanart.tv, AniList, Jikan
- State: TanStack React Query v5
- Error tracking: Sentry (optional, only in prod if VITE_SENTRY_DSN is set)

## Where things live

- `artifacts/bucket-list/src/` — main app source
  - `App.tsx` — root component (consumes react-router-dom hooks; BrowserRouter is provided by main.tsx)
  - `AppRoutes.tsx` — route definitions (/, /upcoming, /watchlist, /watched, /stats)
  - `main.tsx` — entry point with auth guard and provider setup
  - `contexts/` — AppContext, AuthProvider, LibraryProvider, SyncProvider, ToastProvider, SettingsProvider
  - `components/` — UI components (ContentCard, ContentModal, Navbar, Hero, etc.)
  - `pages/` — Home, Watchlist, Watched, Upcoming
  - `features/search/` — GlobalSearch feature
  - `services/` — API clients (tmdb.ts, supabaseClient.ts, anilist.ts, etc.)
  - `lib/` — utilities (db.ts for Dexie, queryClient.ts, recommendationEngine.ts, etc.)
  - `hooks/` — custom hooks (useContentQueries, useFilteredMedia, useMediaToggles, etc.)
- `artifacts/api-server/` — Express backend (healthcheck only, app is mostly client-side)

## Architecture decisions

- **Offline-first**: Dexie.js (IndexedDB) is the primary local store; Supabase syncs in background
- **Minimal PWA**: A lightweight service worker (`public/sw.js`) pre-caches the offline fallback page; `manifest.webmanifest` enables "Add to Home Screen". Full offline caching relies on Dexie.js (IndexedDB).
- **react-window**: Uses `List` export (not `FixedSizeList`) — upgraded package API
- **Client-side only**: No API routes — all data fetching hits external APIs (TMDB, Supabase, etc.) directly from the browser
- **CSP**: Relaxed for Replit proxy (wss:, https: broad) while retaining img-src restrictions

## Required Secrets

Set these in the Replit Secrets panel:

- `VITE_GOOGLE_CLIENT_ID` — Google OAuth Client ID
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/publishable key
- `VITE_TMDB_API_KEY` — TMDB API key
- `VITE_TRAKT_CLIENT_ID` / `VITE_TRAKT_CLIENT_SECRET` — Trakt API
- `VITE_TVDB_API_KEY` — TheTVDB v4 API key
- `VITE_FANART_API_KEY` — Fanart.tv API key
- `VITE_SENTRY_DSN` — (optional) Sentry DSN for error tracking

## User preferences

- Preserve the original dark Netflix-style UI at all costs — no light mode
- App is single-user (personal tool), no multi-user support needed

## Gotchas

- Do NOT run `pnpm dev` at workspace root — use workflows
- `VITE_SUPABASE_ANON_KEY` value should not include trailing comments when set
- react-window exports `List` not `FixedSizeList` in the installed version
- postcss.config.js was intentionally skipped (conflicts with @tailwindcss/vite in Tailwind v4)
