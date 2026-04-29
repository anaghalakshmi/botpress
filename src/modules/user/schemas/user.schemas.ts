import { z } from "zod";

// ── Update profile ─────────────────────────────────────────────────────────
export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be under 100 characters")
      .trim()
      .optional(),

    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
      .optional()
      .nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update",
  });

// ── Change password ────────────────────────────────────────────────────────
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: "Current password is required" })
      .min(1, "Current password is required"),

    newPassword: z
      .string({ required_error: "New password is required" })
      .min(8, "New password must be at least 8 characters")
      .max(128, "New password is too long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "New password must contain uppercase, lowercase, and a number"
      ),

    confirmPassword: z.string({
      required_error: "Please confirm your new password",
    }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

// ── Deactivate account ─────────────────────────────────────────────────────
// Requires password confirmation so no one can accidentally (or maliciously)
// deactivate an account without knowing the password
export const deactivateAccountSchema = z.object({
  password: z
    .string({ required_error: "Password is required to deactivate account" })
    .min(1, "Password is required"),

  confirmation: z.literal("DELETE MY ACCOUNT", {
    errorMap: () => ({
      message: "You must type DELETE MY ACCOUNT exactly to confirm",
    }),
  }),
});

// ── Admin: list users query ────────────────────────────────────────────────
export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(["CUSTOMER", "ADMIN", "DELIVERY_PARTNER"]).optional(),
  search: z.string().max(100).trim().optional(),
});

// ── Admin: update user role ────────────────────────────────────────────────
export const updateUserRoleSchema = z.object({
  role: z.enum(["CUSTOMER", "ADMIN", "DELIVERY_PARTNER"], {
    required_error: "Role is required",
  }),
});

// ── Params ─────────────────────────────────────────────────────────────────
export const userIdParamSchema = z.object({
  id: z.string().uuid("User ID must be a valid UUID"),
});

// ── Inferred types ─────────────────────────────────────────────────────────
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type DeactivateAccountInput = z.infer<typeof deactivateAccountSchema>;
export type ListUsersQueryInput = z.infer<typeof listUsersQuerySchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
