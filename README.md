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

## API Reference

The backend API is documented using Swagger/OpenAPI. Once the server is running, you can view the complete API documentation at:
- `http://localhost:3000/api-docs`

### Key Endpoints:
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Authenticate and retrieve a JWT
- `POST /api/v1/auth/logout` - Blacklist the current JWT
- `POST /api/v1/auth/reset-password` - Request a password reset
- `GET /api/v1/health` - API Healthcheck
- `GET /api/v1/tmdb/*` - Proxied TMDB requests

## Architecture Details

- **Express Middleware:** Uses `helmet` for CSP and security headers, `cors` for cross-origin requests (whitelisted via `FRONTEND_URL`), and `express-rate-limit` for DDoS protection.
- **Global Error Handling:** All unhandled exceptions are caught by a global error handler that logs the stack trace to Pino and returns a clean `500 Internal Server Error` JSON response in production.
- **Caching:** Redis is used via `ioredis` with an exponential backoff retry strategy. Redis handles the JWT blacklist and caches TMDB proxy responses.

## Project Structure

This project uses `pnpm` workspaces for a clean monorepo architecture:

- **`artifacts/bucket-list/`**: Frontend React SPA utilizing Vite and Tailwind CSS.
- **`artifacts/api-server/`**: Backend Express.js server providing authentication and caching proxies.
- **`lib/db/`**: Supabase/PostgreSQL schema definitions and Drizzle ORM configurations.
- **`lib/api-spec/`** & **`lib/api-zod/`**: Shared TypeScript types and Zod validation schemas.
- **`lib/api-client-react/`**: Shared API client integrations.

## Environment Variables

### Backend Configuration (`artifacts/api-server/.env`)
| Variable | Description | Example |
| -------- | ----------- | ------- |
| `PORT` | The port the Express API listens on. | `3000` |
| `FRONTEND_URL` | Comma-separated list of allowed domains for CORS validation. | `http://localhost:5173` |
| `REDIS_URL` | The connection string to your Redis instance. | `redis://localhost:6379` |
| `DATABASE_URL` | Your PostgreSQL/Supabase database connection URI. | `postgresql://user:pass@host:5432/db` |
| `SUPABASE_JWT_SECRET`| Your Supabase Project's JWT Secret used to issue and sign local tokens. | `super_secret_key_string...` |
| `RATE_LIMIT_WINDOW_MS`| Rate limiting window in milliseconds (default: 900000 / 15 min). | `900000` |
| `RATE_LIMIT_MAX_REQUESTS`| Maximum requests per window (default: 100). | `100` |

### Frontend Configuration (`artifacts/bucket-list/.env`)
| Variable | Description | Example |
| -------- | ----------- | ------- |
| `VITE_GOOGLE_CLIENT_ID` | Your Google OAuth 2.0 Client ID for login. | `123456789-xxxx.apps.googleusercontent.com` |
| `VITE_SUPABASE_URL` | Your Supabase Project URL. | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Project Anon/Public Key. | `eyJh...` |
| `VITE_TMDB_API_KEY` | (Optional) Your The Movie Database v3 API key. | `abc123...` |

## Deployment Guidelines
- Ensure the Redis instance is highly available.
- Ensure `SUPABASE_JWT_SECRET` is strong and securely managed.
- Ensure logs from `pino` are directed to a persistent location or a logging aggregator like Datadog.

## Contribution Guidelines
1. Fork the repository and create your feature branch (`git checkout -b feature/amazing-feature`).
2. Run tests locally using `pnpm test` and ensure `pnpm typecheck` passes.
3. Ensure no unused dependencies are introduced. Keep the bundle size small.
4. Commit your changes and push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.
