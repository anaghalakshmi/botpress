import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_VERSION: z.string().default("v1"),

  // Database — required
  DATABASE_URL: z.string().url(),

  // Redis — optional for now, will add later
  REDIS_URL: z.string().url().optional(),

  // JWT — required, min 32 chars
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // Stripe — optional for now
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "http", "debug"]).default("info"),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // CORS
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),

  // ── AI / OpenAI ───────────────────────────────────────────────────────────
  OPENAI_API_KEY: z.string().min(1, "OpenAI API key is required"),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  // Max products injected into prompt — prevents token overflow
  AI_MAX_PRODUCTS: z.coerce.number().default(80),
  // Max messages in conversation history sent to OpenAI
  AI_MAX_HISTORY: z.coerce.number().default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";

export const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((o) =>
  o.trim()
);
