import type { Request, Response } from "express";
import { userService } from "../service/user.service";
import { asyncHandler } from "../../../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../../../utils/response";

// ── Customer: own profile ──────────────────────────────────────────────────

// GET /api/v1/users/me
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getProfile(req.user!.id);
  sendSuccess(res, { user });
});

// PATCH /api/v1/users/me
export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await userService.updateProfile(req.user!.id, req.body);
    sendSuccess(res, { user }, "Profile updated successfully.");
  }
);

// POST /api/v1/users/me/change-password
export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    await userService.changePassword(req.user!.id, req.body);
    sendSuccess(res, null, "Password changed successfully.");
  }
);

// DELETE /api/v1/users/me
export const deactivateAccount = asyncHandler(
  async (req: Request, res: Response) => {
    await userService.deactivateAccount(req.user!.id, req.body);
    sendSuccess(
      res,
      null,
      "Account deactivated successfully. We're sorry to see you go."
    );
  }
);

// ── Admin: user management ─────────────────────────────────────────────────

// GET /api/v1/admin/users
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.listUsers(req.query as never);
  sendPaginated(res, result.data, result.meta);
});

// GET /api/v1/admin/users/:id
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.params["id"]!);
  sendSuccess(res, { user });
});

// PATCH /api/v1/admin/users/:id/role
export const updateUserRole = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await userService.updateUserRole(req.params["id"]!, req.body);
    sendSuccess(res, { user }, `User role updated to ${req.body.role}.`);
  }
);

// PATCH /api/v1/admin/users/:id/activate
export const activateUser = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await userService.toggleUserStatus(req.params["id"]!, true);
    sendSuccess(res, { user }, "User account activated.");
  }
);

// PATCH /api/v1/admin/users/:id/deactivate
export const deactivateUser = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await userService.toggleUserStatus(req.params["id"]!, false);
    sendSuccess(res, { user }, "User account deactivated.");
  }
);
