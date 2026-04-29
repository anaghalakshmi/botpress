import type { Request, Response, NextFunction, RequestHandler } from "express";

// ── asyncHandler ──────────────────────────────────────────────────────────
// Wraps an async route handler so unhandled promise rejections are
// automatically forwarded to Express's error handler via next(err).
//
// Without this wrapper every async handler needs its own try/catch block.
// With it, you just throw AppError anywhere and it routes to errorHandler.
//
// Usage:
//   router.get('/orders', asyncHandler(async (req, res) => {
//     const orders = await orderService.list(req.user.id);
//     sendSuccess(res, orders);
//   }));
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
