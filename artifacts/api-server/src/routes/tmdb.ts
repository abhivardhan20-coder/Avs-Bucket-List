import { Router, Request, Response } from "express";
import { CacheService } from "../services/CacheService";
import { logger } from "../lib/logger";
import rateLimit from "express-rate-limit";

const router = Router();

const tmdbLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit TMDB requests to 60 per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many TMDB proxy requests, please try again later." },
});

router.use(tmdbLimiter);

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
// Since api-server requires VITE_TMDB_API_KEY from env, let's load it dynamically
router.get(/.*/, async (req: Request, res: Response) => {
  try {
    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    if (!TMDB_API_KEY) {
      res.status(500).json({ error: "TMDB API key is not configured on the server." });
      return;
    }

    const cleanPath = req.path.startsWith('/') ? req.path.slice(1) : req.path;
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const fullPath = `/${cleanPath}${queryString ? `?${queryString}` : ""}`;

    // Cache key incorporates the full path
    const cacheKey = `tmdb_proxy:${fullPath}`;

    // Check Cache
    const cachedResponse = await CacheService.get<any>(cacheKey);
    if (cachedResponse) {
      res.json(cachedResponse);
      return;
    }

    // Fetch from TMDB
    const separator = fullPath.includes("?") ? "&" : "?";
    const tmdbUrl = `${TMDB_BASE_URL}${fullPath}${separator}api_key=${TMDB_API_KEY}`;

    const response = await fetch(tmdbUrl, {
      headers: { accept: "application/json" },
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after') || '10';
      res.status(429).json({ error: "TMDB API rate limit exceeded", retryAfter });
      return;
    }

    if (!response.ok) {
      res.status(response.status).json({ error: `TMDB API error: ${response.statusText}` });
      return;
    }

    const data = await response.json();

    // Cache the response for 4 hours (14400 seconds)
    await CacheService.set(cacheKey, data, 14400);

    res.json(data);
  } catch (error) {
    logger.error({ err: error, url: req.originalUrl }, "Failed to proxy TMDB request");
    res.status(500).json({ error: "Internal server error while proxying TMDB request" });
  }
});

export default router;
