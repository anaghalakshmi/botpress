import { db } from "../../../lib/db";

// Full cart select — fetches everything needed to render cart in one query
const CART_SELECT = {
  id: true,
  userId: true,
  items: {
    select: {
      id: true,
      quantity: true,
      productId: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          priceInPaise: true,
          imageUrl: true,
          unit: true,
          isActive: true,
          inventory: {
            select: {
              quantityAvailable: true,
              reservedQuantity: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

export const cartRepository = {
  // Get or create a cart for a user — every customer has exactly one cart
  async getOrCreateCart(userId: string) {
    return db.cart.upsert({
      where: { userId },
      update: {}, // touch nothing if it already exists
      create: { userId },
      select: CART_SELECT,
    });
  },

  async getCartByUserId(userId: string) {
    return db.cart.findUnique({
      where: { userId },
      select: CART_SELECT,
    });
  },

  // Add item or increment quantity if it already exists in cart
  async upsertCartItem(cartId: string, productId: string, quantity: number) {
    return db.cartItem.upsert({
      where: { cartId_productId: { cartId, productId } },
      update: { quantity },
      create: { cartId, productId, quantity },
    });
  },

  // Find a specific item in the cart
  async findCartItem(cartId: string, productId: string) {
    return db.cartItem.findUnique({
      where: { cartId_productId: { cartId, productId } },
    });
  },

  // Remove one product from cart
  async removeCartItem(cartId: string, productId: string) {
    return db.cartItem.deleteMany({
      where: { cartId, productId },
    });
  },

  // Wipe all items — called after a successful order is placed
  async clearCart(cartId: string) {
    return db.cartItem.deleteMany({
      where: { cartId },
    });
  },

  async getCartItemCount(userId: string): Promise<number> {
    const cart = await db.cart.findUnique({
      where: { userId },
      select: { _count: { select: { items: true } } },
    });
    return cart?._count.items ?? 0;
  },
};
