import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import router from "./routes";
import { logger } from "./lib/logger";
import { env } from "./lib/env";

const app: Express = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  xssFilter: true,
  frameguard: { action: "deny" },
  hidePoweredBy: true,
}));

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: "Too many requests, please try again later." },
  skip: (req) => req.path.startsWith('/api/health') || req.path === '/healthz' // Exclude health checks
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
      // Allow requests with no origin (like mobile apps or curl requests)
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
  if (req.path.startsWith('/api/health')) {
    return next();
  }
  return corsMiddleware(req, res, next);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
