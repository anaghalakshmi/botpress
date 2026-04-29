import { verifyAccessToken } from "../lib/jwt";
import { AppError } from "../types";
import type { Request, Response, NextFunction } from "express";

// ── authenticate ───────────────────────────────────────────────────────────
// Validates the Bearer token in the Authorization header.
// On success: attaches req.user = { id, email, role }
// On failure: throws 401 which is caught by the global error handler
//
// Usage: router.get('/profile', authenticate, handler)
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers["authorization"];

  if (!authHeader?.startsWith("Bearer ")) {
    return next(
      AppError.unauthorized(
        "Authorization header is missing or malformed. Expected: Bearer <token>"
      )
    );
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    const payload = verifyAccessToken(token);

    // Attach to request — available in all subsequent middleware and handlers
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role as unknown as
        | "customer"
        | "admin"
        | "delivery_partner",
    };

    next();
  } catch (err) {
    // jwt.verify throws JsonWebTokenError, TokenExpiredError, NotBeforeError
    const message =
      err instanceof Error && err.name === "TokenExpiredError"
        ? "Access token has expired. Please refresh your session."
        : "Invalid access token. Please log in again.";

    next(AppError.unauthorized(message));
  }
}
