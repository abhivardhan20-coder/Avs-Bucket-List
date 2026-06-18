# AV's Bucket List

AV's Bucket List is a comprehensive personal media tracker for your favorite movies and TV shows. Keep track of what you've watched, manage your watchlist, and get smart recommendations based on your preferences.

## Features

- **Media Tracking:** Track movies and TV shows.
- **Recommendations:** Get intelligent suggestions based on your watch history.
- **Authentication:** Secure user authentication and JWT-based session management.
- **Security:** CSP configuration, Helmet, rate limiting, and Redis-backed token revocation.
- **PWA:** Progressive Web App capabilities for native-like experience.

## Architecture

This project is built as a monorepo using `pnpm` workspaces.

- **Frontend:** React, Vite, Tailwind CSS (`artifacts/bucket-list`)
- **Backend:** Node.js, Express, PostgreSQL with Drizzle ORM (`artifacts/api-server`)
- **Database:** Supabase/PostgreSQL (`lib/db`)
- **Shared Code:** Types, API client (`lib/api-spec`, `lib/api-client-react`, `lib/api-zod`)

## Setup Instructions

### Prerequisites
- Node.js (v20+)
- pnpm (v10)
- Redis server
- PostgreSQL database (or Supabase instance)

### Installation
1. Clone the repository and install dependencies:
   ```sh
   pnpm install
   ```
2. Copy `.env.example` to `.env` and fill in your configuration:
   ```sh
   cp .env.example .env
   ```
   *Ensure you define `REDIS_URL` in your backend environment (default: `redis://localhost:6379`).*

### Running the Project
To start the development servers for both frontend and backend concurrently:
```sh
pnpm run dev
```

### Type Checking & Testing
- Type check: `pnpm run typecheck`
- Run tests: `pnpm run test`

## Environment Variables

Key variables for the backend:
- `PORT`: API server port (default 3000)
- `FRONTEND_URL`: Allowed frontend origins for CORS.
- `REDIS_URL`: URL to your Redis instance.
- `DATABASE_URL`: Your PostgreSQL connection string.
- `SUPABASE_JWT_SECRET`: Comma-separated list of JWT secrets.
- `ALLOW_NO_ORIGIN`: Boolean string (`true`/`false`) to allow mobile/server-to-server API calls.

## Deployment Guidelines
- Ensure the Redis instance is highly available.
- Make sure `ALLOW_NO_ORIGIN` is configured according to your needs.
- Ensure `SUPABASE_JWT_SECRET` is strong and securely managed.
- Ensure logs from `pino` are directed to a persistent location or a logging aggregator like Datadog.
