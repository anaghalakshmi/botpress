import bcrypt from "bcryptjs";
import { userRepository } from "../repository/user.repository";
import { AppError } from "../../../types";
import type { UserProfileDto, UserSummaryDto } from "../user.types";
import type {
  UpdateProfileInput,
  ChangePasswordInput,
  DeactivateAccountInput,
  ListUsersQueryInput,
  UpdateUserRoleInput,
} from "../schemas/user.schemas";

const BCRYPT_ROUNDS = 12;

export const userService = {
  // ── GET /users/me ──────────────────────────────────────────────────────────
  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound("User");
    return user as UserProfileDto;
  },

  // ── PATCH /users/me ────────────────────────────────────────────────────────
  async updateProfile(
    userId: string,
    dto: UpdateProfileInput
  ): Promise<UserProfileDto> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound("User");

    const updated = await userRepository.updateProfile(userId, dto);
    return updated as UserProfileDto;
  },

  // ── POST /users/me/change-password ─────────────────────────────────────────
  async changePassword(
    userId: string,
    dto: ChangePasswordInput
  ): Promise<void> {
    const user = await userRepository.findByIdWithHash(userId);
    if (!user) throw AppError.notFound("User");

    // Verify the current password before allowing a change
    const isValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash
    );
    if (!isValid) {
      throw AppError.badRequest(
        "Current password is incorrect.",
        "INVALID_CURRENT_PASSWORD"
      );
    }

    const newHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await userRepository.updatePassword(userId, newHash);

    // Note: we intentionally do NOT revoke existing sessions after a password
    // change — the user is already authenticated and this is a deliberate action.
    // For higher security apps, add: await authRepository.deleteAllUserRefreshTokens(userId)
  },

  // ── DELETE /users/me ───────────────────────────────────────────────────────
  // Soft deactivation — requires password + explicit confirmation phrase
  async deactivateAccount(
    userId: string,
    dto: DeactivateAccountInput
  ): Promise<void> {
    const user = await userRepository.findByIdWithHash(userId);
    if (!user) throw AppError.notFound("User");

    // Verify password before deactivating — prevents accidental or malicious use
    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw AppError.badRequest(
        "Password is incorrect. Account not deactivated.",
        "INVALID_PASSWORD"
      );
    }

    await userRepository.deactivate(userId);
  },

  // ── Admin: GET /admin/users ────────────────────────────────────────────────
  async listUsers(params: ListUsersQueryInput) {
    const { users, total } = await userRepository.findAll(params);

    return {
      data: users as unknown as UserSummaryDto[],
      meta: {
        total,
        page: params.page,
        limit: params.limit,
        hasNext: params.page * params.limit < total,
      },
    };
  },

  // ── Admin: GET /admin/users/:id ────────────────────────────────────────────
  async getUserById(id: string): Promise<UserProfileDto> {
    const user = await userRepository.findById(id);
    if (!user) throw AppError.notFound("User");
    return user as UserProfileDto;
  },

  // ── Admin: PATCH /admin/users/:id/role ────────────────────────────────────
  async updateUserRole(
    id: string,
    dto: UpdateUserRoleInput
  ): Promise<UserProfileDto> {
    const user = await userRepository.findById(id);
    if (!user) throw AppError.notFound("User");

    const updated = await userRepository.updateRole(id, dto.role);
    return updated as UserProfileDto;
  },

  // ── Admin: PATCH /admin/users/:id/status ──────────────────────────────────
  async toggleUserStatus(
    id: string,
    isActive: boolean
  ): Promise<UserProfileDto> {
    const user = await userRepository.findById(id);
    if (!user) throw AppError.notFound("User");

    if (user.isActive === isActive) {
      const state = isActive ? "already active" : "already deactivated";
      throw AppError.badRequest(`User is ${state}.`, "NO_CHANGE");
    }

    const updated = await userRepository.toggleActive(id, isActive);
    return updated as UserProfileDto;
  },
};
