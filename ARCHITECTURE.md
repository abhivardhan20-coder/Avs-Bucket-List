# Architecture Overview

## Frontend Architecture
- **Framework**: React via Vite
- **State Management**: Context API (Providers in src/contexts like AppContext.tsx, LibraryProvider.tsx) and Zustand for fast access in granular components.
- **Component Hierarchy**: 
  - RootLayout wraps the application navigation.
  - AppRoutes dynamically loads pages using lazy imports.
  - Pages communicate with global Context providers to read/write state.

## Backend Architecture
- **Server**: Express + Node.js (via tsup).
- **Routing**: Controllers grouped under routes/.
- **Database**: Drizzle ORM configured in lib/db, mapping to Postgres/Supabase.
- **Caching**: Redis-backed cache with in-memory graceful degradation.
