import jwt, { type SignOptions } from "jsonwebtoken";
import {
  AccessTokenPayload,
  RefreshTokenPayload,
} from "../modules/auth/auth.types";
import { env } from "../config/env";

// ── Access token ───────────────────────────────────────────────────────────
// Short-lived (15 min default). Sent in Authorization header on every request.
// Never stored anywhere — lives only in client memory.
export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: (env.JWT_ACCESS_EXPIRES_IN ?? "15m") as SignOptions["expiresIn"],
    algorithm: "HS256",
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

// ── Refresh token ──────────────────────────────────────────────────────────
// Long-lived (7 days default). Stored as httpOnly cookie — JS can never read it.
// A record in refresh_tokens table allows server-side revocation.
export function signRefreshToken(payload: RefreshTokenPayload): string {
  const options: SignOptions = {
    expiresIn: (env.JWT_REFRESH_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"],
    algorithm: "HS256",
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
