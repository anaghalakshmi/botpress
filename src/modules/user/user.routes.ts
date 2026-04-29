import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requireAdmin } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import {
  getProfile,
  updateProfile,
  changePassword,
  deactivateAccount,
  listUsers,
  getUserById,
  updateUserRole,
  activateUser,
  deactivateUser,
} from "../user/controller/user.controller";
import {
  updateProfileSchema,
  changePasswordSchema,
  deactivateAccountSchema,
  listUsersQuerySchema,
  updateUserRoleSchema,
  userIdParamSchema,
} from "../user/schemas/user.schemas";

const router = Router();

// All user routes require authentication
router.use(authenticate);

// ── Customer: own profile routes (/api/v1/users/me) ───────────────────────

// GET /api/v1/users/me
router.get("/me", getProfile);

// PATCH /api/v1/users/me
router.patch("/me", validate({ body: updateProfileSchema }), updateProfile);

// POST /api/v1/users/me/change-password
router.post(
  "/me/change-password",
  validate({ body: changePasswordSchema }),
  changePassword
);

// DELETE /api/v1/users/me  — soft deactivate own account
router.delete(
  "/me",
  validate({ body: deactivateAccountSchema }),
  deactivateAccount
);

// ── Admin: user management routes (/api/v1/users/admin) ───────────────────

// GET /api/v1/users/admin/all
router.get(
  "/admin/all",
  requireAdmin,
  validate({ query: listUsersQuerySchema }),
  listUsers
);

// GET /api/v1/users/admin/:id
router.get(
  "/admin/:id",
  requireAdmin,
  validate({ params: userIdParamSchema }),
  getUserById
);

// PATCH /api/v1/users/admin/:id/role
router.patch(
  "/admin/:id/role",
  requireAdmin,
  validate({ params: userIdParamSchema, body: updateUserRoleSchema }),
  updateUserRole
);

// PATCH /api/v1/users/admin/:id/activate
router.patch(
  "/admin/:id/activate",
  requireAdmin,
  validate({ params: userIdParamSchema }),
  activateUser
);

// PATCH /api/v1/users/admin/:id/deactivate
router.patch(
  "/admin/:id/deactivate",
  requireAdmin,
  validate({ params: userIdParamSchema }),
  deactivateUser
);

export default router;
