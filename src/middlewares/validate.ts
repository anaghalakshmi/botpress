import type { Request, Response, NextFunction } from "express";
import { type ZodSchema } from "zod";

interface ValidationTargets {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

// ── validate() ───────────────────────────────────────────────────────────
// Factory that returns middleware for one or more of body / params / query.
// On success: replaces req.body/params/query with the typed, sanitized data.
// On failure: throws a ZodError which is caught by the global error handler.
//
// Usage:
//   router.post('/orders', validate({ body: createOrderSchema }), handler)
//   router.get('/:id',     validate({ params: idParamSchema }),   handler)
export function validate(targets: ValidationTargets) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (targets.body) {
        req.body = targets.body.parse(req.body);
      }
      if (targets.params) {
        req.params = targets.params.parse(req.params);
      }
      if (targets.query) {
        req.query = targets.query.parse(req.query);
      }
      next();
    } catch (err) {
      next(err); // ZodError → errorHandler → 422 with field-level details
    }
  };
}
