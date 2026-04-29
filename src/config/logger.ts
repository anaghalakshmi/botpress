import winston from "winston";
import { env, isProduction } from "./env";

const { combine, timestamp, json, colorize, simple, errors } = winston.format;

// ── Formats ───────────────────────────────────────────────────────────────
// Production: structured JSON (parsed by Loki / Datadog)
const productionFormat = combine(
  errors({ stack: true }), // include stack traces as a field, not a string blob
  timestamp({ format: "ISO" }),
  json()
);

// Development: colored, human-readable output
const developmentFormat = combine(
  errors({ stack: true }),
  timestamp({ format: "HH:mm:ss" }),
  colorize({ all: true }),
  simple()
);

// ── Logger instance ───────────────────────────────────────────────────────
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: isProduction ? productionFormat : developmentFormat,
  defaultMeta: {
    service: "grocery-api",
    version: process.env.npm_package_version ?? "unknown",
    env: env.NODE_ENV,
  },
  transports: [
    new winston.transports.Console(),
    // Add file / Loki transports here in production
  ],
  // Prevent unhandled rejections from crashing silently
  exceptionHandlers: [new winston.transports.Console()],
  rejectionHandlers: [new winston.transports.Console()],
});

// ── Child logger factory ──────────────────────────────────────────────────
// Use to attach request context to all logs within a single request scope
export function createRequestLogger(traceId: string, userId?: string) {
  return logger.child({ traceId, userId: userId ?? null });
}
