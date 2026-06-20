import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import router from "./routes";
import { logger } from "./lib/logger";
import { env } from "./lib/env";
import { cleanupBlacklist } from "./lib/blacklist";

import * as Sentry from "@sentry/node";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./docs/swagger";

if (process.env.SENTRY_DSN && process.env.SENTRY_DSN !== 'https://placeholder@o0.ingest.sentry.io/0') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
}

const app: Express = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "same-site" },
  xssFilter: true,
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://image.tmdb.org"],
      connectSrc: ["'self'", "https://api.themoviedb.org"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// Health check specific rate limiter
const healthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit health checks to 10 per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many health check requests." },
});

// Apply health limiter only to health routes
app.use(`/api/${env.API_VERSION}/health`, healthLimiter);
app.use('/healthz', healthLimiter);

// General Rate limiting middleware
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: "Too many requests, please try again later." },
  skip: (req) => req.path.startsWith(`/api/${env.API_VERSION}/health`) || req.path === '/healthz' // Exclude health checks from general limiter if desired
});

app.use(limiter);

// HTTPS Enforcement Middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    if (req.headers['x-forwarded-proto'] !== 'https' && req.secure === false) {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
  }
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Validate FRONTEND_URL entries
const allowedOrigins = env.FRONTEND_URL.split(",").map(url => url.trim()).filter(url => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    logger.warn(`Invalid origin URL found in FRONTEND_URL: ${url}`);
    return false;
  }
});

app.use(cors((req, callback) => {
  // Allow health checks explicitly
  if (req.path.startsWith(`/api/${env.API_VERSION}/health`) || req.path === '/healthz') {
    return callback(null, { origin: true });
  }

  const origin = req.header('Origin');
  if (!origin) {
    // Reject requests missing origin unless explicitly allowed
    return callback(new Error('Not allowed by CORS (missing Origin)'), { origin: false });
  }

  if (allowedOrigins.indexOf(origin) !== -1) {
    return callback(null, { origin: true, credentials: env.ALLOW_CREDENTIALS });
  }
  
  return callback(new Error('Not allowed by CORS'), { origin: false });
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(`/api-docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(`/api/${env.API_VERSION}`, router);

// Sentry error handler should be right before any other error handlers
if (env.SENTRY_DSN && env.SENTRY_DSN !== 'https://placeholder@o0.ingest.sentry.io/0') {
  Sentry.setupExpressErrorHandler(app);
}

import { AppError } from "./lib/AppError";
import crypto from "crypto";

// Global error handler
app.use((err: Error | AppError, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const isAppError = err instanceof AppError;
  const errorId = isAppError && err.errorId ? err.errorId : crypto.randomUUID();
  const statusCode = isAppError ? err.statusCode : (err as any).status || (err as any).statusCode || 500;
  
  // Sanitize logging
  logger.error({ errorId, type: err.name, message: err.message }, "Unhandled error");
  
  if (res.headersSent) {
    return next(err);
  }

  const message = statusCode === 500 ? "Internal Server Error" : err.message;
  
  res.status(statusCode).json({
    error: {
      message,
      errorId,
      type: isAppError ? err.type : err.name || 'Error',
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack, 
        details: isAppError ? err.details : (err as any).details 
      })
    }
  });
});

export default app;
