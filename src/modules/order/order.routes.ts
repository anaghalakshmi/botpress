import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requireAdmin } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import {
  placeOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
} from "../order/controller/order.controller";
import {
  placeOrderSchema,
  updateOrderStatusSchema,
  orderIdParamSchema,
  orderQuerySchema,
} from "../order/schemas/orders.schemas";

const router = Router();

// All order routes require a logged-in user
router.use(authenticate);

// ── Customer routes ────────────────────────────────────────────────────────

// POST /api/v1/orders — place order from current cart
router.post("/", validate({ body: placeOrderSchema }), placeOrder);

// GET /api/v1/orders — get my order history
router.get("/", validate({ query: orderQuerySchema }), getMyOrders);

// GET /api/v1/orders/:id — get one order (own only for customers)
router.get("/:id", validate({ params: orderIdParamSchema }), getOrderById);

// POST /api/v1/orders/:id/cancel — cancel an order
router.post(
  "/:id/cancel",
  validate({ params: orderIdParamSchema }),
  cancelOrder
);

// ── Admin routes ───────────────────────────────────────────────────────────

// GET /api/v1/orders/admin/all — view all orders across all users
router.get(
  "/admin/all",
  requireAdmin,
  validate({ query: orderQuerySchema }),
  getAllOrders
);

// PATCH /api/v1/orders/admin/:id/status — update order status
router.patch(
  "/admin/:id/status",
  requireAdmin,
  validate({ params: orderIdParamSchema, body: updateOrderStatusSchema }),
  updateOrderStatus
);

export default router;
