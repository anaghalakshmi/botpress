import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import { sendSuccess } from "../../../utils/response";
import {
  REFRESH_COOKIE_OPTIONS,
  REFRESH_COOKIE_CLEAR_OPTIONS,
  REFRESH_TOKEN_COOKIE_NAME,
} from "../auth.cookies";
import { authService } from "../service/auth.service";

// ── POST /auth/signup ──────────────────────────────────────────────────────
// Validation is applied in the router via validate() middleware before
// this handler runs — req.body is already typed and sanitized by the time
// we get here.
export const signup = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.signup(req.body);

  // Set refresh token as httpOnly cookie — JS cannot read it
  res.cookie(
    REFRESH_TOKEN_COOKIE_NAME,
    result.tokens.refreshToken,
    REFRESH_COOKIE_OPTIONS
  );

  // Return access token in body — client stores it in memory (not localStorage)
  sendSuccess(
    res,
    {
      user: result.user,
      accessToken: result.tokens.accessToken,
    },
    "Account created successfully.",
    201
  );
});

// ── POST /auth/login ───────────────────────────────────────────────────────
export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);

  res.cookie(
    REFRESH_TOKEN_COOKIE_NAME,
    result.tokens.refreshToken,
    REFRESH_COOKIE_OPTIONS
  );

  sendSuccess(
    res,
    {
      user: result.user,
      accessToken: result.tokens.accessToken,
    },
    "Login successful."
  );
});

// ── POST /auth/refresh ─────────────────────────────────────────────────────
// No Authorization header needed — uses the httpOnly cookie automatically
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] as
    | string
    | undefined;

  if (!rawToken) {
    // Import AppError lazily to avoid circular deps
    const { AppError } = await import("../../../types");
    throw AppError.unauthorized("No refresh token provided. Please log in.");
  }

  const result = await authService.refresh(rawToken);

  // Rotate: clear old cookie, set new one
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, REFRESH_COOKIE_CLEAR_OPTIONS);
  res.cookie(
    REFRESH_TOKEN_COOKIE_NAME,
    result.tokens.refreshToken,
    REFRESH_COOKIE_OPTIONS
  );

  sendSuccess(
    res,
    {
      accessToken: result.tokens.accessToken,
    },
    "Token refreshed."
  );
});

// ── POST /auth/logout ──────────────────────────────────────────────────────
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] as
    | string
    | undefined;

  await authService.logout(rawToken);

  // Clear the cookie regardless of whether we found the token in DB
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, REFRESH_COOKIE_CLEAR_OPTIONS);

  sendSuccess(res, null, "Logged out successfully.");
});

// ── GET /auth/me ───────────────────────────────────────────────────────────
// Protected route — authenticate middleware runs before this handler
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  // req.user is set by the authenticate middleware
  const user = await authService.getMe(req.user!.id);
  sendSuccess(res, { user });
});
