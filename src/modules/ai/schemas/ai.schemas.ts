// src/modules/ai/schemas/ai.schemas.ts
import { z } from "zod";

export const chatSchema = z.object({
  message: z
    .string({ required_error: "Message is required" })
    .min(1, "Message cannot be empty")
    .max(500, "Message must be under 500 characters")
    .trim(),

  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
      })
    )
    .max(20)
    .optional()
    .default([]),

  budget: z.number().int().min(0).optional(),
});

export type ChatInput = z.infer<typeof chatSchema>;
