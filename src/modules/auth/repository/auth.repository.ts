import crypto from "node:crypto";
import { db } from "../../../lib/db";
import type { SafeUser } from "../auth.types";

// ── User queries ───────────────────────────────────────────────────────────

export const authRepository = {
  // Find user by email — used during login
  // Returns passwordHash for verification, stripped from all public responses
  async findUserByEmail(email: string) {
    return db.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passwordHash: true,
        isActive: true,
        createdAt: true,
      },
    });
  },

  // Find user by ID — used after token verification
  async findUserById(id: string): Promise<SafeUser | null> {
    return db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }) as Promise<SafeUser | null>;
  },

  // Create new user — called during signup
  async createUser(data: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<SafeUser> {
    return db.user.create({
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }) as Promise<SafeUser>;
  },

  // Check if email is already registered
  async emailExists(email: string): Promise<boolean> {
    const count = await db.user.count({ where: { email } });
    return count > 0;
  },

  // ── Refresh token queries ────────────────────────────────────────────────

  // Store a new refresh token record
  // We store a SHA-256 hash — the raw token never touches the database
  async createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return db.refreshToken.create({ data });
  },

  // Find refresh token record by its hash for validation
  async findRefreshToken(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    return db.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });
  },

  // Delete one specific refresh token (logout from current device)
  async deleteRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await db.refreshToken.deleteMany({ where: { tokenHash } });
  },

  // Delete ALL refresh tokens for a user (logout from all devices)
  async deleteAllUserRefreshTokens(userId: string): Promise<void> {
    await db.refreshToken.deleteMany({ where: { userId } });
  },

  // Clean up expired tokens — call this periodically (e.g. daily cron)
  async deleteExpiredTokens(): Promise<number> {
    const result = await db.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  },
};

// ── Private helper ─────────────────────────────────────────────────────────
// SHA-256 hash of the raw token — same function used in both store and lookup
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
