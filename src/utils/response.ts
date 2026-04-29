import type { Response } from "express";
import type { ApiResponse } from "../types";

// ── sendSuccess ───────────────────────────────────────────────────────────
// Call from any route handler to return a typed success response.
//
//  res.status(201).json(...)  ← old way (repeated boilerplate)
//  sendSuccess(res, data, 'Order created', 201)  ← new way
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
  meta?: ApiResponse<T>["meta"]
): void {
  const body: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta }),
  };
  res.status(statusCode).json(body);
}

// ── sendPaginated ─────────────────────────────────────────────────────────
// Convenience wrapper for list endpoints that include pagination metadata
export function sendPaginated<T>(
  res: Response,
  data: T[],
  meta: Required<
    Pick<NonNullable<ApiResponse["meta"]>, "page" | "limit" | "total">
  >
): void {
  sendSuccess(res, data, undefined, 200, {
    ...meta,
    hasNext: meta.page * meta.limit < meta.total,
  });
}
