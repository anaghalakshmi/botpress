// ── Enums ──────────────────────────────────────────────────────────────────
export enum UserRole {
  CUSTOMER = "CUSTOMER",
  ADMIN = "ADMIN",
}

// ── Request DTOs (what the client sends) ───────────────────────────────────
export interface SignupDto {
  name: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

// ── Token payloads (what lives inside the JWT) ─────────────────────────────
// Keep this minimal — it's encoded in every request header
export interface AccessTokenPayload {
  sub: string; // user ID
  email: string;
  role: UserRole;
  sessionId: string; // Added sessionId property
  // iat and exp are added automatically by jsonwebtoken
}

export interface RefreshTokenPayload {
  sub: string; // user ID
  tokenId: string; // matches refresh_tokens.id — enables per-session revocation
}

// ── Service return shapes ──────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export interface AuthResult {
  user: SafeUser;
  tokens: AuthTokens;
}

// ── Extended Express Request ───────────────────────────────────────────────
// Augments req.user so TypeScript knows its shape throughout the app
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: "customer" | "admin" | "delivery_partner";
        sessionId: string;
      };
    }
  }
}
