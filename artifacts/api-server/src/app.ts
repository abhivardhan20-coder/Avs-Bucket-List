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

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
}

const app: Express = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  xssFilter: true,
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://image.tmdb.org"],
      connectSrc: ["'self'", "https://api.themoviedb.org"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: "Too many requests, please try again later." },
  skip: (req) => req.path.startsWith(`/api/${env.API_VERSION}/health`) || req.path === '/healthz' // Exclude health checks
});

app.use(limiter);

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
const allowedOrigins = env.FRONTEND_URL.split(",").map(url => url.trim());

const corsMiddleware = cors({
  origin: function (origin, callback) {
    if (!origin) {
      // Mobile apps and server-to-server requests often lack an Origin header
      return callback(null, true);
    }
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
});

app.use((req, res, next) => {
  if (req.path.startsWith(`/api/${env.API_VERSION}/health`)) {
    return next();
  }
  return corsMiddleware(req, res, next);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(`/api-docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(`/api/${env.API_VERSION}`, router);

// Sentry error handler should be right before any other error handlers
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

export default app;
