import { Router } from "express";
import rateLimit from "express-rate-limit";
import { loginSchema, signupSchema } from "./schemas/auth.schemas";
import { validate } from "../../middlewares/validate";
import {
  getMe,
  login,
  logout,
  refresh,
  signup,
} from "./controller/auth.controller";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();

// ── Auth-specific rate limiter ─────────────────────────────────────────────
// Much tighter than the global limiter — auth endpoints are brute-force targets.
// 10 attempts per 15 minutes per IP before lockout.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many attempts. Please wait 15 minutes before trying again.",
    },
  },
  // Skip rate limiting in tests
  skip: () => process.env["NODE_ENV"] === "test",
});

// ── Public routes (no auth required) ─────────────────────────────────────
// POST /api/v1/auth/signup
router.post(
  "/signup",
  authLimiter,
  validate({ body: signupSchema }), // Zod validates + sanitizes req.body
  signup
);

// POST /api/v1/auth/login
router.post("/login", authLimiter, validate({ body: loginSchema }), login);

// POST /api/v1/auth/refresh   (uses httpOnly cookie — no body needed)
router.post("/refresh", refresh);

// POST /api/v1/auth/logout    (uses httpOnly cookie — no body needed)
router.post("/logout", logout);

// ── Protected routes (requires valid access token) ────────────────────────
// GET /api/v1/auth/me
router.get("/me", authenticate, getMe);

export default router;
