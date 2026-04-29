import { Router } from "express";
import { getHealth } from "../../controllers/health.controller";

const router = Router();

// GET /health
// Shallow liveness check — no DB/Redis dependency
router.get("/", getHealth);

export default router;
