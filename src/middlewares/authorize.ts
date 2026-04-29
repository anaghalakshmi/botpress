import { UserRole } from "../modules/auth/auth.types";
import { AppError } from "../types";
import type { Request, Response, NextFunction, RequestHandler } from "express";

// ── requireRole ────────────────────────────────────────────────────────────
// Factory that returns middleware restricting a route to specific roles.
// Must be used AFTER authenticate middleware (needs req.user).
//
// Usage:
//   router.get('/admin/users', authenticate, requireRole(UserRole.ADMIN), handler)
//   router.patch('/orders/:id', authenticate, requireRole(UserRole.ADMIN, UserRole.CUSTOMER), handler)
export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // This should never happen if used correctly after authenticate
    if (!req.user) {
      return next(AppError.unauthorized("Authentication required."));
    }

    const hasPermission = allowedRoles.includes(req.user.role as UserRole);

    if (!hasPermission) {
      return next(
        AppError.forbidden(
          `This action requires one of the following roles: ${allowedRoles.join(
            ", "
          )}.`
        )
      );
    }

    next();
  };
}

// ── Convenience exports ────────────────────────────────────────────────────
// Pre-built middleware for common role checks — reduces boilerplate in routes
export const requireAdmin = requireRole(UserRole.ADMIN);
export const requireCustomer = requireRole(UserRole.CUSTOMER, UserRole.ADMIN);
// Admin can always access customer routes (superset of permissions)
