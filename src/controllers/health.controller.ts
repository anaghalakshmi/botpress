import type { Request, Response } from "express";
import { sendSuccess } from "../utils/response";
import { env } from "../config/env";

// ── Health response shape ─────────────────────────────────────────────────
interface HealthStatus {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  uptime: number;
  version: string;
  env: string;
  memory: {
    used: string;
    total: string;
  };
}

// ── getHealth ─────────────────────────────────────────────────────────────
// GET /health
// This endpoint intentionally does NOT check DB or Redis connectivity.
// It answers only: "is this process running?" which is what the load
// balancer needs to know before routing traffic.
//
// Deep dependency checks belong on GET /health/ready (added in a later step
// alongside Prisma and Redis client setup).
export function getHealth(_req: Request, res: Response): void {
  const mem = process.memoryUsage();

  const status: HealthStatus = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: process.env["npm_package_version"] ?? "1.0.0",
    env: env.NODE_ENV,
    memory: {
      used: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,
      total: `${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
    },
  };

  sendSuccess(res, status);
}
