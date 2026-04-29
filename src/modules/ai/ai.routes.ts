// src/modules/ai/ai.routes.ts
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { chat } from "./controller/ai.controller";
import { validate } from "../../middlewares/validate";
import { chatSchema } from "./schemas/ai.schemas";

const router = Router();

// Tighter rate limit for AI endpoints — each call costs money
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 AI requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests to the AI assistant. Please wait a moment.",
    },
  },
  skip: () => process.env["NODE_ENV"] === "test",
});

// POST /api/v1/ai/chat
// Auth is OPTIONAL — guests can also use the assistant
// If authenticated, req.user is available for personalization
router.post("/chat", aiRateLimiter, validate({ body: chatSchema }), chat);

export default router;
