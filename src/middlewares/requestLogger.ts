import type { Request, Response, NextFunction } from "express";
import { v4 as uuid } from "uuid";
import { createRequestLogger } from "../config/logger";

// ── Paths to skip ─────────────────────────────────────────────────────────
// Health checks and metrics fire constantly — logging them is noise
const SKIP_PATHS = new Set(["/health", "/metrics", "/favicon.ico"]);

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip noisy endpoints
  if (SKIP_PATHS.has(req.path)) {
    next();
    return;
  }

  // Attach trace ID — propagate from upstream if provided, otherwise generate
  const traceId = (req.headers["x-trace-id"] as string | undefined) ?? uuid();
  req.traceId = traceId;

  // Expose to clients and downstream services
  res.setHeader("x-trace-id", traceId);

  // Attach a request-scoped logger — all logs in route handlers include traceId
  req.log = createRequestLogger(traceId, req.user?.id);

  // Record start time for duration calculation
  const startMs = Date.now();

  // Log when response finishes — we know status code and duration
  res.on("finish", () => {
    const durationMs = Date.now() - startMs;
    const level =
      res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

    req.log[level]("http_request", {
      method: req.method,
      path: req.route?.path ?? req.path,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Surface slow requests as warnings regardless of status
    if (durationMs > 500) {
      req.log.warn("slow_request", {
        durationMs,
        method: req.method,
        path: req.path,
        threshold: 500,
      });
    }
  });

  next();
}
