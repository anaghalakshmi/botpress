import { db } from "../../../lib/db";
import type {
  UpdateProfileInput,
  ListUsersQueryInput,
} from "../schemas/user.schemas";

// Safe user fields — never expose passwordHash
const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const userRepository = {
  // ── Profile queries ────────────────────────────────────────────────────────

  async findById(id: string) {
    return db.user.findUnique({
      where: { id },
      select: PROFILE_SELECT,
    });
  },

  // Fetch passwordHash for verification — only used internally for password
  // change and account deactivation flows
  async findByIdWithHash(id: string) {
    return db.user.findUnique({
      where: { id },
      select: { ...PROFILE_SELECT, passwordHash: true },
    });
  },

  async updateProfile(id: string, data: UpdateProfileInput) {
    return db.user.update({
      where: { id },
      data,
      select: PROFILE_SELECT,
    });
  },

  async updatePassword(id: string, passwordHash: string) {
    return db.user.update({
      where: { id },
      data: { passwordHash },
      select: { id: true },
    });
  },

  // Soft deactivate — marks account inactive rather than hard deleting
  // Preserves order history, prevents re-registration with same email
  async deactivate(id: string) {
    return db.$transaction(async (tx: any) => {
      // Mark account inactive
      await tx.user.update({
        where: { id },
        data: { isActive: false },
      });

      // Revoke all active sessions immediately
      await tx.refreshToken.deleteMany({ where: { userId: id } });

      // Clear the user's cart
      const cart = await tx.cart.findUnique({ where: { userId: id } });
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      }
    });
  },

  // ── Admin queries ──────────────────────────────────────────────────────────

  async findAll(params: ListUsersQueryInput) {
    const where: Record<string, unknown> = {};

    if (params.role) where["role"] = params.role;
    if (params.search) {
      where["OR"] = [
        { name: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          ...PROFILE_SELECT,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      db.user.count({ where }),
    ]);

    return { users, total };
  },

  async updateRole(id: string, role: string) {
    return db.user.update({
      where: { id },
      data: { role: role as never },
      select: PROFILE_SELECT,
    });
  },

  async toggleActive(id: string, isActive: boolean) {
    return db.$transaction(async (tx: any) => {
      const user = await tx.user.update({
        where: { id },
        data: { isActive },
        select: PROFILE_SELECT,
      });

      // Revoke all sessions when deactivating
      if (!isActive) {
        await tx.refreshToken.deleteMany({ where: { userId: id } });
      }

      return user;
    });
  },
};
