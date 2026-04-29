import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError, type ApiErrorResponse } from "../types";
import { logger } from "../config/logger";
import { isProduction } from "../config/env";

// ── Zod error formatter ───────────────────────────────────────────────────
function formatZodError(err: ZodError): Record<string, string[]> {
  return err.flatten().fieldErrors as Record<string, string[]>;
}

// ── Global error handler ──────────────────────────────────────────────────
// Must have 4 parameters — Express identifies it as an error handler by arity
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const traceId = req.traceId ?? "unknown";

  // ── Zod validation error ─────────────────────────────────────────────
  if (err instanceof ZodError) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: formatZodError(err),
        requestId: traceId,
      },
    };
    res.status(422).json(response);
    return;
  }

  // ── Operational AppError ─────────────────────────────────────────────
  // These are expected errors we've deliberately thrown (404, 401, etc.)
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error("app_error", {
        traceId,
        code: err.code,
        message: err.message,
        stack: err.stack,
      });
    } else {
      logger.warn("client_error", {
        traceId,
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
      });
    }

    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        requestId: traceId,
        // Include details if attached (e.g., from AppError.unprocessable)
        ...("details" in err && {
          details: (err as AppError & { details: unknown }).details,
        }),
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // ── Unexpected / programmer error ────────────────────────────────────
  // Log everything — we never know what this is in production
  logger.error("unhandled_error", {
    traceId,
    message: err instanceof Error ? err.message : "Unknown error",
    stack: err instanceof Error ? err.stack : undefined,
    type: typeof err,
  });

  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      // Never leak internal details to clients in production
      message: isProduction ? "An unexpected error occurred" : String(err),
      requestId: traceId,
    },
  };
  res.status(500).json(response);
}

// ── 404 handler ───────────────────────────────────────────────────────────
// Placed after all routes; catches any unmatched path
export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  next(AppError.notFound(`Route ${req.method} ${req.path}`));
}
