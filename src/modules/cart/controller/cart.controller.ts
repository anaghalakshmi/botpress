import type { Request, Response } from "express";
import { cartService } from "../service/cart.service";
import { asyncHandler } from "../../../utils/asyncHandler";
import { sendSuccess } from "../../../utils/response";

// GET /api/v1/cart
export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.getCart(req.user!.id);
  sendSuccess(res, { cart });
});

// POST /api/v1/cart/items
export const addToCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.addItem(req.user!.id, req.body);
  sendSuccess(res, { cart }, "Item added to cart.", 201);
});

// PATCH /api/v1/cart/items/:productId
export const updateCartItem = asyncHandler(
  async (req: Request, res: Response) => {
    const cart = await cartService.updateItem(
      req.user!.id,
      req.params["productId"]!,
      req.body
    );
    sendSuccess(res, { cart }, "Cart item updated.");
  }
);

// DELETE /api/v1/cart/items/:productId
export const removeCartItem = asyncHandler(
  async (req: Request, res: Response) => {
    const cart = await cartService.removeItem(
      req.user!.id,
      req.params["productId"]!
    );
    sendSuccess(res, { cart }, "Item removed from cart.");
  }
);

// DELETE /api/v1/cart
export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  await cartService.clearCart(req.user!.id);
  sendSuccess(res, null, "Cart cleared.");
});
