import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { validate } from "../../middlewares/validate";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "./controller/cart.controller";
import {
  addToCartSchema,
  updateCartItemSchema,
  cartItemParamSchema,
} from "../order/schemas/orders.schemas";

const router = Router();

router.use(authenticate);

router.get("/", getCart);

router.post("/items", validate({ body: addToCartSchema }), addToCart);

router.patch(
  "/items/:productId",
  validate({ params: cartItemParamSchema, body: updateCartItemSchema }),
  updateCartItem
);

router.delete(
  "/items/:productId",
  validate({ params: cartItemParamSchema }),
  removeCartItem
);

router.delete("/", clearCart);

export default router;
