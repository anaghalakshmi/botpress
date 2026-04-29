import type { Request, Response } from "express";
import type winston from "winston";

// ── API response envelope ─────────────────────────────────────────────────
// Every endpoint returns this shape, making client-side handling predictable
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasNext?: boolean;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
  };
}

// ── Application error ─────────────────────────────────────────────────────
// Thrown anywhere in the app; caught by the global error handler middleware
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    isOperational = true
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  // ── Convenience factories ─────────────────────────────────────────────
  static badRequest(message: string, code = "BAD_REQUEST") {
    return new AppError(message, 400, code);
  }

  static unauthorized(message = "Authentication required") {
    return new AppError(message, 401, "UNAUTHORIZED");
  }

  static forbidden(message = "Insufficient permissions") {
    return new AppError(message, 403, "FORBIDDEN");
  }

  static notFound(resource: string) {
    return new AppError(`${resource} not found`, 404, "NOT_FOUND");
  }

  static conflict(message: string, code = "CONFLICT") {
    return new AppError(message, 409, code);
  }

  static unprocessable(message: string, details?: unknown) {
    const err = new AppError(message, 422, "VALIDATION_ERROR");
    (err as AppError & { details: unknown }).details = details;
    return err;
  }

  static tooManyRequests(message = "Rate limit exceeded") {
    return new AppError(message, 429, "RATE_LIMIT_EXCEEDED");
  }
}

// ── Extended Express types ────────────────────────────────────────────────
// Augments the global Express namespace so req.user, req.traceId,
// and req.log are available throughout the app without casting
declare global {
  namespace Express {
    interface Request {
      traceId: string;
      log: winston.Logger;
      user?: {
        id: string;
        role: "customer" | "admin" | "delivery_partner";
        sessionId: string;
      };
    }
  }
}

// ── Utility types ─────────────────────────────────────────────────────────
export type TypedRequest<
  TBody = unknown,
  TParams = unknown,
  TQuery = unknown
> = Request<
  TParams extends Record<string, string> ? TParams : Record<string, string>,
  unknown,
  TBody,
  TQuery extends Record<string, string> ? TQuery : Record<string, string>
>;

export type TypedResponse<T = unknown> = Response<ApiResponse<T>>;
