// src/middlewares/botAuth.ts
// Verifies that incoming requests are from your Botpress bot
// Add BOT_API_SECRET to your .env file and Botpress environment variables

import type { Request, Response, NextFunction } from "express";

export function botAuth(req: Request, res: Response, next: NextFunction) {
  const secret = process.env["BOT_API_SECRET"];
  const incoming = req.headers["x-bot-secret"];

  // If no secret is configured, skip verification (development only)
  if (!secret) {
    console.warn(
      "[botAuth] BOT_API_SECRET not set — skipping bot auth verification"
    );
    return next();
  }

  if (!incoming || incoming !== secret) {
    return res.status(403).json({
      success: false,
      error: { code: "BOT_AUTH_FAILED", message: "Invalid bot secret" },
    });
  }

  next();
}
