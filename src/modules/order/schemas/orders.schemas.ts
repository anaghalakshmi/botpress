import { z } from "zod";

// ── Cart schemas ───────────────────────────────────────────────────────────

export const addToCartSchema = z.object({
  productId: z
    .string({ required_error: "Product ID is required" })
    .uuid("Product ID must be a valid UUID"),

  quantity: z
    .number({ required_error: "Quantity is required" })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(99, "Maximum 99 units per product"),
});

export const updateCartItemSchema = z.object({
  quantity: z
    .number({ required_error: "Quantity is required" })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(99, "Maximum 99 units per product"),
});

export const cartItemParamSchema = z.object({
  productId: z.string().uuid("Product ID must be a valid UUID"),
});

// ── Order schemas ──────────────────────────────────────────────────────────

export const placeOrderSchema = z.object({
  deliveryAddress: z
    .string({ required_error: "Delivery address is required" })
    .min(10, "Please provide a complete delivery address")
    .max(500, "Address is too long")
    .trim(),

  notes: z
    .string()
    .max(500, "Notes must be under 500 characters")
    .trim()
    .optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(
    [
      "PENDING_PAYMENT",
      "CONFIRMED",
      "PICKING",
      "DISPATCHED",
      "DELIVERED",
      "CANCELLED",
    ],
    { required_error: "Status is required" }
  ),
});

export const orderIdParamSchema = z.object({
  id: z.string().uuid("Order ID must be a valid UUID"),
});

export const orderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z
    .enum([
      "PENDING_PAYMENT",
      "CONFIRMED",
      "PICKING",
      "DISPATCHED",
      "DELIVERED",
      "CANCELLED",
    ])
    .optional(),
});

// ── Inferred types ─────────────────────────────────────────────────────────
export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;
