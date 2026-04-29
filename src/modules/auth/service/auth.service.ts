import bcrypt from "bcryptjs";
import { authRepository } from "../repository/auth.repository";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../../lib/jwt";
import { AppError } from "../../../types";
import type { SignupInput, LoginInput } from "../schemas/auth.schemas";
import type { AuthResult, AuthTokens, SafeUser } from "../auth.types";
import { UserRole } from "../auth.types";

// Refresh token TTL — 7 days expressed in milliseconds
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// bcrypt cost factor — 12 is the production-safe minimum (≈250ms on modern hardware)
const BCRYPT_ROUNDS = 12;

export const authService = {
  // ── Signup ───────────────────────────────────────────────────────────────
  // Decision: we hash before checking email uniqueness to prevent a timing
  // oracle — but we check email first to avoid wasting bcrypt cycles.
  async signup(dto: SignupInput): Promise<AuthResult> {
    // 1. Reject duplicate email — friendly error before touching bcrypt
    const exists = await authRepository.emailExists(dto.email);
    if (exists) {
      throw AppError.conflict(
        "An account with this email already exists.",
        "EMAIL_ALREADY_EXISTS"
      );
    }

    // 2. Hash password — bcrypt includes its own random salt
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // 3. Persist user
    const user = await authRepository.createUser({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });

    // 4. Issue tokens
    const tokens = await issueTokenPair(user);
    return { user, tokens };
  },

  // ── Login ─────────────────────────────────────────────────────────────────
  // Security: always run bcrypt.compare even when user is not found.
  // This prevents timing attacks that could enumerate valid email addresses.
  async login(dto: LoginInput): Promise<AuthResult> {
    const user = await authRepository.findUserByEmail(dto.email);

    // Dummy hash — ensures bcrypt.compare always runs (constant time)
    const DUMMY_HASH = "$2a$12$dummyhashtopreventtimingattacksxxxxxxxxxxxxxxx";
    const hashToCheck = user?.passwordHash ?? DUMMY_HASH;
    const passwordValid = await bcrypt.compare(dto.password, hashToCheck);

    // Single generic error — never reveal which field was wrong
    if (!user || !passwordValid || !user.isActive) {
      throw AppError.unauthorized("Invalid email or password.");
    }

    const safeUser: SafeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      createdAt: user.createdAt,
    };

    const tokens = await issueTokenPair(safeUser);
    return { user: safeUser, tokens };
  },

  // ── Refresh ───────────────────────────────────────────────────────────────
  // Implements token rotation: every refresh call invalidates the old
  // refresh token and issues a brand new pair. If the old token is reused
  // after rotation (stolen token scenario), we revoke ALL sessions.
  async refresh(rawRefreshToken: string): Promise<AuthResult> {
    // 1. Verify JWT signature and expiry
    let payload;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw AppError.unauthorized(
        "Invalid or expired refresh token. Please log in again."
      );
    }

    // 2. Look up the DB record — confirms the token hasn't been revoked
    const stored = await authRepository.findRefreshToken(rawRefreshToken);
    if (!stored) {
      // Token was already used or never existed.
      // Could be a stolen token reuse — revoke all sessions for this user
      await authRepository.deleteAllUserRefreshTokens(payload.sub);
      throw AppError.unauthorized(
        "Refresh token has already been used. All sessions revoked for security."
      );
    }

    // 3. Check token hasn't expired in the DB (belt-and-suspenders)
    if (stored.expiresAt < new Date()) {
      await authRepository.deleteRefreshToken(rawRefreshToken);
      throw AppError.unauthorized("Session expired. Please log in again.");
    }

    // 4. Check user account is still active
    if (!stored.user.isActive) {
      throw AppError.unauthorized("Account is deactivated.");
    }

    // 5. Delete old token (rotation — old token can never be reused)
    await authRepository.deleteRefreshToken(rawRefreshToken);

    const safeUser: SafeUser = {
      id: stored.user.id,
      name: stored.user.name,
      email: stored.user.email,
      role: stored.user.role as UserRole,
      createdAt: stored.user.createdAt,
    };

    // 6. Issue fresh token pair
    const tokens = await issueTokenPair(safeUser);
    return { user: safeUser, tokens };
  },

  // ── Logout ────────────────────────────────────────────────────────────────
  // Deletes the refresh token record — access token expires naturally.
  // We can't revoke access tokens (stateless) but they're short-lived (15 min).
  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;
    // Silently ignore errors — token may already be expired or deleted
    try {
      await authRepository.deleteRefreshToken(rawRefreshToken);
    } catch {
      // No-op
    }
  },

  // ── Get current user ──────────────────────────────────────────────────────
  async getMe(userId: string): Promise<SafeUser> {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw AppError.notFound("User");
    }
    return user;
  },
};

// ── Private: issue an access + refresh token pair ─────────────────────────
async function issueTokenPair(user: SafeUser): Promise<AuthTokens> {
  // 1. Sign access token (stateless — no DB write)
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  // 2. Create a DB record for the refresh token so it can be revoked
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  // Sign with a temporary placeholder — we need the DB-assigned ID in the payload
  // Pattern: create record first, then sign with its ID
  const tempRecord = await authRepository.createRefreshToken({
    userId: user.id,
    tokenHash: "pending", // temporary, replaced immediately below
    expiresAt,
  });

  // 3. Sign refresh token embedding the DB record ID (enables revocation lookup)
  const refreshToken = signRefreshToken({
    sub: user.id,
    tokenId: tempRecord.id,
  });

  // 4. Store the SHA-256 hash of the raw token (raw token never persists)
  const crypto = await import("node:crypto");
  const tokenHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  // Update the placeholder hash with the real one
  await import("../../../lib/db").then(({ db }) =>
    db.refreshToken.update({
      where: { id: tempRecord.id },
      data: { tokenHash },
    })
  );

  return { accessToken, refreshToken };
}
