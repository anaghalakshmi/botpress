import { orderRepository } from "../repository/order.repository";
import { cartRepository } from "../../cart/repository/cart.repository";
import { AppError } from "../../../types";
import type { OrderDto, OrderStatus, OrderItemDto } from "../order.types";
import { ORDER_STATUS_TRANSITIONS } from "../order.types";
import type {
  PlaceOrderInput,
  UpdateOrderStatusInput,
  OrderQueryInput,
} from "../schemas/orders.schemas";

export const orderService = {
  // ── Place order ──────────────────────────────────────────────────────────
  // Converts the user's cart into a confirmed order.
  // Validates stock, locks in prices, reserves inventory, then clears cart.
  async placeOrder(userId: string, dto: PlaceOrderInput): Promise<OrderDto> {
    // 1. Get the user's cart with fresh product + stock data
    const cart = await cartRepository.getCartByUserId(userId);

    if (!cart || cart.items.length === 0) {
      throw AppError.badRequest(
        "Your cart is empty. Add products before placing an order.",
        "EMPTY_CART"
      );
    }

    // 2. Validate every item — stock may have changed since items were added
    const stockErrors: string[] = [];

    for (const item of cart.items) {
      if (!item.product.isActive) {
        stockErrors.push(`"${item.product.name}" is no longer available.`);
        continue;
      }

      const inv = item.product.inventory;
      const available =
        (inv?.quantityAvailable ?? 0) - (inv?.reservedQuantity ?? 0);

      if (item.quantity > available) {
        stockErrors.push(
          available === 0
            ? `"${item.product.name}" is out of stock.`
            : `"${item.product.name}" only has ${available} unit(s) available (you need ${item.quantity}).`
        );
      }
    }

    // Report ALL stock issues at once — don't make users fix one at a time
    if (stockErrors.length > 0) {
      throw AppError.conflict(stockErrors.join(" "), "STOCK_UNAVAILABLE");
    }

    // 3. Lock in prices at the moment of purchase
    // This protects the customer if the admin changes prices after they added to cart
    const orderItems = cart.items.map(
      (item: {
        productId: any;
        quantity: any;
        product: { priceInPaise: any };
      }) => ({
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: item.product.priceInPaise, // price snapshot
      })
    );

    const totalInPaise = orderItems.reduce(
      (sum: number, item: { priceAtPurchase: number; quantity: number }) =>
        sum + item.priceAtPurchase * item.quantity,
      0
    );

    // 4. Create order + reserve inventory (single transaction)
    const order = await orderRepository.createOrder({
      userId,
      totalInPaise,
      deliveryAddress: dto.deliveryAddress,
      notes: dto.notes,
      items: orderItems,
    });

    // 5. Clear the cart — order is placed
    await cartRepository.clearCart(cart.id);

    return formatOrder(order);
  },

  // ── Get user's orders ────────────────────────────────────────────────────
  async getUserOrders(userId: string, params: OrderQueryInput) {
    const { orders, total } = await orderRepository.findByUserId(
      userId,
      params
    );
    return {
      data: orders.map(formatOrder),
      meta: {
        total,
        page: params.page,
        limit: params.limit,
        hasNext: params.page * params.limit < total,
      },
    };
  },

  // ── Get single order ─────────────────────────────────────────────────────
  async getOrderById(
    orderId: string,
    userId: string,
    isAdmin: boolean
  ): Promise<OrderDto> {
    const order = await orderRepository.findById(orderId);

    if (!order) throw AppError.notFound("Order");

    // Customers can only see their own orders
    if (isAdmin && order.userId !== userId) {
      throw AppError.forbidden("You do not have access to this order.");
    }

    return formatOrder(order);
  },

  // ── Admin: get all orders ────────────────────────────────────────────────
  async getAllOrders(params: OrderQueryInput) {
    const { orders, total } = await orderRepository.findAll(params);
    return {
      data: orders.map(formatOrder),
      meta: {
        total,
        page: params.page,
        limit: params.limit,
        hasNext: params.page * params.limit < total,
      },
    };
  },

  // ── Update order status (admin) ───────────────────────────────────────────
  // Enforces the state machine — prevents invalid transitions
  async updateOrderStatus(
    orderId: string,
    dto: UpdateOrderStatusInput
  ): Promise<OrderDto> {
    const order = await orderRepository.findById(orderId);
    if (!order) throw AppError.notFound("Order");

    const currentStatus = order.status as OrderStatus;
    const requestedStatus = dto.status as OrderStatus;

    // Validate transition is allowed
    const allowedNext = ORDER_STATUS_TRANSITIONS[currentStatus];
    if (!allowedNext.includes(requestedStatus)) {
      throw AppError.badRequest(
        `Cannot move order from ${currentStatus} to ${requestedStatus}. ` +
          `Allowed transitions: ${
            allowedNext.join(", ") || "none (terminal state)"
          }.`,
        "INVALID_STATUS_TRANSITION"
      );
    }

    // Side effects based on transition
    if (requestedStatus === "CANCELLED") {
      // Release reserved inventory back to available
      await orderRepository.releaseInventory(orderId);
    }

    if (requestedStatus === "DELIVERED") {
      // Permanently deduct from available stock
      await orderRepository.confirmInventoryDeduction(orderId);
    }

    const updated = await orderRepository.updateStatus(
      orderId,
      requestedStatus
    );
    return formatOrder(updated);
  },

  // ── Customer: cancel own order ────────────────────────────────────────────
  async cancelOrder(orderId: string, userId: string): Promise<OrderDto> {
    const order = await orderRepository.findById(orderId);

    if (!order) throw AppError.notFound("Order");
    if (order.userId !== userId)
      throw AppError.forbidden("You cannot cancel this order.");

    const currentStatus = order.status as OrderStatus;

    // Customers can only cancel before it's picked
    const cancellableStatuses: OrderStatus[] = ["PENDING_PAYMENT", "CONFIRMED"];
    if (!cancellableStatuses.includes(currentStatus)) {
      throw AppError.badRequest(
        `Order cannot be cancelled once it is ${currentStatus.toLowerCase()}. Please contact support.`,
        "CANNOT_CANCEL"
      );
    }

    await orderRepository.releaseInventory(orderId);
    const updated = await orderRepository.updateStatus(orderId, "CANCELLED");
    return formatOrder(updated);
  },
};

// ── Formatter ──────────────────────────────────────────────────────────────
type RawOrder = Awaited<ReturnType<typeof orderRepository.findById>>;

function formatOrder(raw: NonNullable<RawOrder>): OrderDto {
  const items: OrderItemDto[] = raw.orderItems.map(
    (item: {
      id: any;
      productId: any;
      quantity: number;
      priceAtPurchase: number;
      product: any;
    }) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      priceAtPurchase: item.priceAtPurchase,
      subtotalInPaise: item.priceAtPurchase * item.quantity,
      product: item.product,
    })
  );

  return {
    id: raw.id,
    userId: raw.userId,
    status: raw.status as OrderStatus,
    totalInPaise: raw.totalInPaise,
    deliveryAddress: raw.deliveryAddress,
    notes: raw.notes,
    items,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}
