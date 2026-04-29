import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";

// ── Bootstrap ─────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  const app = createApp();
  const server = http.createServer(app);

  // ── Start listening ──────────────────────────────────────────────────
  await new Promise<void>((resolve, reject) => {
    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        logger.error(`Port ${env.PORT} is already in use`);
      }
      reject(err);
    });
    server.listen(env.PORT, resolve);
  });

  logger.info("server_started", {
    port: env.PORT,
    env: env.NODE_ENV,
    version: env.API_VERSION,
    pid: process.pid,
  });

  // ── Graceful shutdown ────────────────────────────────────────────────
  // On SIGTERM (ECS task stop / k8s pod eviction) or SIGINT (Ctrl+C):
  //  1. Stop accepting new connections
  //  2. Wait for in-flight requests to complete (30s max)
  //  3. Close DB pool and Redis connection
  //  4. Exit cleanly
  const shutdown = (signal: string) => {
    logger.info("shutdown_initiated", { signal });

    server.close(async (err) => {
      if (err) {
        logger.error("shutdown_error", { message: err.message });
        process.exit(1);
      }

      try {
        // TODO: close db.$disconnect() and redis.quit() here
        // once Prisma and Redis clients are initialized
        logger.info("shutdown_complete");
        process.exit(0);
      } catch (cleanupErr) {
        logger.error("shutdown_cleanup_error", { error: cleanupErr });
        process.exit(1);
      }
    });

    // Force exit if shutdown takes too long
    setTimeout(() => {
      logger.error("shutdown_timeout — forcing exit");
      process.exit(1);
    }, 30_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// ── Run ───────────────────────────────────────────────────────────────────
bootstrap().catch((err) => {
  logger.error("bootstrap_failed", { error: err });
  process.exit(1);
});
