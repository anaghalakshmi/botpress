import { isProduction } from "../../config/env";
import type { CookieOptions } from "express";

// ── Refresh token cookie ───────────────────────────────────────────────────
// httpOnly  — JavaScript cannot read this cookie (blocks XSS token theft)
// secure    — only sent over HTTPS (enforced in production)
// sameSite  — 'strict' prevents the cookie being sent on cross-site requests (CSRF defence)
// path      — cookie only sent to /api/v1/auth routes, not every request
export const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: "/api/v1/auth",
};

// Used when clearing the cookie on logout — must match the original options
export const REFRESH_COOKIE_CLEAR_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict",
  path: "/api/v1/auth",
};

export const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";
