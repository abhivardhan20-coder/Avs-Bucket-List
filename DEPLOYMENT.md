# Deployment Guide

This document outlines best practices for deploying AV's Bucket List to production.

## 1. Environment & Secrets Management
- **Environment Separation**: Maintain strict separation between `development`, `staging`, and `production` environments using distinct `.env` files or platform-specific variables.
- **Secrets Management**: Never commit your `.env` file to version control. In production, consider injecting secrets dynamically using a robust secrets manager (e.g., HashiCorp Vault, AWS Secrets Manager, or Doppler). 
- **`SUPABASE_JWT_SECRET`**: Ensure this remains strictly confidential and securely injected into the runtime environment.

## 2. Redis High Availability
AV's Bucket List relies on Redis for rate limiting, session storage, and caching. 
- **Standalone Mode vs Cluster**: The codebase uses `ioredis` which natively supports standard Redis deployments.
- **Production Setup**: For production, do NOT run a single local Redis instance. Rely on a managed service (e.g., Upstash, AWS ElastiCache, or Redis Enterprise Cloud) configured for High Availability (HA) via replicas and failover mechanisms.
- **Configuration**: Ensure `REDIS_URL` points to the primary endpoint of your HA cluster (e.g., `rediss://...` for TLS).

## 3. Logging & Monitoring
We use `pino` for structured JSON logging.
- **Log Aggregation**: In production, pipe these logs directly into a centralized logging provider like Datadog, ELK stack (Elasticsearch, Logstash, Kibana), or Grafana Loki.
  - Example setup via terminal pipe: `node dist/index.mjs | pino-datadog --key <API_KEY>`
- **Application Monitoring / Error Tracking**: The backend is instrumented with Sentry out of the box. Provide the `SENTRY_DSN` environment variable to instantly aggregate unhandled exceptions and monitor API performance traces.

## 4. Reverse Proxy / Gateway
Always run the Node.js API server behind a reverse proxy like Nginx, Caddy, or an Application Load Balancer to handle SSL termination, load balancing, and additional rate limiting.

## 5. Migrations
Run your Drizzle database migrations (`pnpm run db:migrate`) as part of a release phase rather than directly inside your application startup sequence to prevent concurrent migration deadlocks during horizontal scaling.
