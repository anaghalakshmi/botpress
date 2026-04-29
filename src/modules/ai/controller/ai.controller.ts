// src/modules/ai/controller/ai.controller.ts
import type { Request, Response } from "express";
import { aiService } from "../service/ai.service";
import { asyncHandler } from "../../../utils/asyncHandler";
import { sendSuccess } from "../../../utils/response";

// POST /api/v1/ai/chat
export const chat = asyncHandler(async (req: Request, res: Response) => {
  const result = await aiService.chat({
    message: req.body.message,
    userId: req.user?.id, // optional — works for guests too
    history: req.body.history ?? [],
    budget: req.body.budget,
  });

  sendSuccess(res, result);
});
