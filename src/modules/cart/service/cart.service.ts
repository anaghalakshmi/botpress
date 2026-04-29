import { cartRepository } from "../repository/cart.repository";
import { AppError } from "../../../types";
import type { CartDto, CartItemDto } from "../../order/order.types";
import type {
  AddToCartInput,
  UpdateCartItemInput,
} from "../../order/schemas/orders.schemas";

export const cartService = {
  // GET cart — get or create for user, then format
  async getCart(userId: string): Promise<CartDto> {
    const cart = await cartRepository.getOrCreateCart(userId);
    return formatCart(cart);
  },

  // POST /cart/items — add a product or set its quantity
  async addItem(userId: string, dto: AddToCartInput): Promise<CartDto> {
    const cart = await cartRepository.getOrCreateCart(userId);

    // Validate product exists, is active, and has enough stock
    const existing = cart.items.find(
      (i: { productId: string }) => i.productId === dto.productId
    );
    const product = existing?.product;

    if (!product) {
      // Product not in cart yet — verify it exists via a fresh DB look up
      // (cart query only fetches items already in the cart)
      const { db } = await import("../../../lib/db");
      const dbProduct = await db.product.findUnique({
        where: { id: dto.productId },
        select: {
          id: true,
          isActive: true,
          name: true,
          inventory: {
            select: { quantityAvailable: true, reservedQuantity: true },
          },
        },
      });

      if (!dbProduct || !dbProduct.isActive) {
        throw AppError.notFound("Product");
      }

      const available =
        (dbProduct.inventory?.quantityAvailable ?? 0) -
        (dbProduct.inventory?.reservedQuantity ?? 0);

      if (dto.quantity > available) {
        throw AppError.conflict(
          `Only ${available} unit(s) available for this product.`,
          "INSUFFICIENT_STOCK"
        );
      }
    } else {
      // Product already in cart — check against updated quantity
      const available =
        (product.inventory?.quantityAvailable ?? 0) -
        (product.inventory?.reservedQuantity ?? 0);

      if (dto.quantity > available) {
        throw AppError.conflict(
          `Only ${available} unit(s) available. You currently have ${
            existing?.quantity ?? 0
          } in your cart.`,
          "INSUFFICIENT_STOCK"
        );
      }
    }

    await cartRepository.upsertCartItem(cart.id, dto.productId, dto.quantity);

    // Re-fetch to return up-to-date cart
    const updated = await cartRepository.getOrCreateCart(userId);
    return formatCart(updated);
  },

  // PATCH /cart/items/:productId — change quantity of an item
  async updateItem(
    userId: string,
    productId: string,
    dto: UpdateCartItemInput
  ): Promise<CartDto> {
    const cart = await cartRepository.getOrCreateCart(userId);
    const item = cart.items.find(
      (i: { productId: string }) => i.productId === productId
    );

    if (!item) {
      throw AppError.notFound("Cart item");
    }

    const available =
      (item.product.inventory?.quantityAvailable ?? 0) -
      (item.product.inventory?.reservedQuantity ?? 0);

    if (dto.quantity > available) {
      throw AppError.conflict(
        `Only ${available} unit(s) available.`,
        "INSUFFICIENT_STOCK"
      );
    }

    await cartRepository.upsertCartItem(cart.id, productId, dto.quantity);

    const updated = await cartRepository.getOrCreateCart(userId);
    return formatCart(updated);
  },

  // DELETE /cart/items/:productId — remove one item
  async removeItem(userId: string, productId: string): Promise<CartDto> {
    const cart = await cartRepository.getOrCreateCart(userId);
    await cartRepository.removeCartItem(cart.id, productId);

    const updated = await cartRepository.getOrCreateCart(userId);
    return formatCart(updated);
  },

  // DELETE /cart — empty the entire cart
  async clearCart(userId: string): Promise<void> {
    const cart = await cartRepository.getOrCreateCart(userId);
    await cartRepository.clearCart(cart.id);
  },
};

// ── Formatter ──────────────────────────────────────────────────────────────
// Shapes the raw Prisma result into the clean CartDto the API returns.
// Totals are always computed here — never stored in the DB.
type RawCart = Awaited<ReturnType<typeof cartRepository.getOrCreateCart>>;

function formatCart(raw: RawCart): CartDto {
  const items: CartItemDto[] = raw.items
    .filter((item: { product: { isActive: any } }) => item.product.isActive) // hide deactivated products silently
    .map(
      (item: {
        product: {
          inventory: any;
          id: any;
          name: any;
          slug: any;
          priceInPaise: number;
          imageUrl: any;
          unit: any;
        };
        id: any;
        productId: any;
        quantity: number;
      }) => {
        const inv = item.product.inventory;
        const available =
          (inv?.quantityAvailable ?? 0) - (inv?.reservedQuantity ?? 0);
        const status =
          available <= 0
            ? "OUT_OF_STOCK"
            : available <= 5
            ? "LOW_STOCK"
            : "IN_STOCK";

        return {
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          product: {
            id: item.product.id,
            name: item.product.name,
            slug: item.product.slug,
            priceInPaise: item.product.priceInPaise,
            imageUrl: item.product.imageUrl,
            unit: item.product.unit,
            stockStatus: status,
            availableQty: available,
          },
          subtotalInPaise: item.product.priceInPaise * item.quantity,
        };
      }
    );

  const totalInPaise = items.reduce((sum, i) => sum + i.subtotalInPaise, 0);
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  return {
    id: raw.id,
    userId: raw.userId,
    items,
    totalInPaise,
    totalItems: items.length,
    totalQuantity,
  };
}
