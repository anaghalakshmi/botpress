import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { env, allowedOrigins, isProduction } from "./config/env";
import cookieParser from "cookie-parser";
import { logger } from "./config/logger";
import { requestLogger } from "./middlewares/requestLogger";
import v1Router from "./routes/v1";
import { errorHandler, notFoundHandler } from "./middlewares/errorhandler";

export function createApp(): Application {
  const app = express();

  // ── 1. Trust proxy ──────────────────────────────────────────────────────
  // Required when running behind AWS ALB / Nginx so req.ip is accurate
  if (isProduction) {
    app.set("trust proxy", 1);
  }

  // ── 2. Security headers (Helmet) ────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", "data:", "https://cdn.groceryapp.com"],
              connectSrc: ["'self'"],
              frameSrc: ["'none'"],
              objectSrc: ["'none'"],
            },
          }
        : false, // Disabled in development to allow Swagger UI etc.
      hsts: isProduction
        ? { maxAge: 31536000, includeSubDomains: true }
        : false,
    })
  );

  // ── 3. CORS ─────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow server-to-server requests (no origin) and whitelisted origins
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn("cors_blocked", { origin });
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true, // Allow cookies (refresh token)
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-trace-id"],
      exposedHeaders: ["x-trace-id"], // Clients can read the trace ID
    })
  );

  // ── 4. Response compression ──────────────────────────────────────────────
  app.use(
    compression({
      threshold: 1024, // Only compress responses over 1 KB
    })
  );

  // ── 5. Body parsers ──────────────────────────────────────────────────────
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());
  // ── 6. Global rate limiter ───────────────────────────────────────────────
  // A tighter per-route limiter is applied to auth endpoints separately
  const globalLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true, // Return rate limit info in RateLimit-* headers
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests, please try again later.",
      },
    },
  });
  app.use("/api/", globalLimiter);

  // ── 7. Request logging ───────────────────────────────────────────────────
  // After body parsers so req.body is available, before routes so traceId
  // is attached before any handler runs
  app.use(requestLogger);

  // ── 8. API routes ────────────────────────────────────────────────────────
  app.use(`/api/${env.API_VERSION}`, v1Router);

  // ── 9. 404 handler ───────────────────────────────────────────────────────
  // Must come after all routes and before the error handler
  app.use(notFoundHandler);

  // ── 10. Global error handler ─────────────────────────────────────────────
  // Must be last — Express identifies error handlers by their 4-arg signature
  app.use(errorHandler);

  return app;
}
