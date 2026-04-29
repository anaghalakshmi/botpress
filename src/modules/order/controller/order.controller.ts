import type { Request, Response } from "express";
import { orderService } from "../service/orders.service";
import { asyncHandler } from "../../../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../../../utils/response";
import { UserRole } from "../../auth/auth.types";

// POST /api/v1/orders — place an order from cart
export const placeOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.placeOrder(req.user!.id, req.body);
  sendSuccess(res, { order }, "Order placed successfully.", 201);
});

// GET /api/v1/orders — customer sees their own orders
export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const result = await orderService.getUserOrders(
    req.user!.id,
    req.query as never
  );
  sendPaginated(res, result.data, result.meta);
});

// GET /api/v1/orders/:id — get single order (customer: own only, admin: any)
export const getOrderById = asyncHandler(
  async (req: Request, res: Response) => {
    const isAdmin = req.user!.role === "admin";
    const order = await orderService.getOrderById(
      req.params["id"]!,
      req.user!.id,
      isAdmin
    );
    sendSuccess(res, { order });
  }
);

// GET /api/v1/admin/orders — admin sees all orders
export const getAllOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await orderService.getAllOrders(req.query as never);
    sendPaginated(res, result.data, result.meta);
  }
);

// PATCH /api/v1/admin/orders/:id/status — admin updates order status
export const updateOrderStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const order = await orderService.updateOrderStatus(
      req.params["id"]!,
      req.body
    );
    sendSuccess(res, { order }, `Order status updated to ${req.body.status}.`);
  }
);

// POST /api/v1/orders/:id/cancel — customer cancels their order
export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.cancelOrder(req.params["id"]!, req.user!.id);
  sendSuccess(res, { order }, "Order cancelled successfully.");
});
