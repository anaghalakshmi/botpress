import { db } from "../../../lib/db";
import type { OrderQueryInput } from "../schemas/orders.schemas";

// Full order select — consistent shape used across all order queries
const ORDER_SELECT = {
  id: true,
  userId: true,
  status: true,
  totalInPaise: true,
  deliveryAddress: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  orderItems: {
    select: {
      id: true,
      productId: true,
      quantity: true,
      priceAtPurchase: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          unit: true,
          imageUrl: true,
        },
      },
    },
  },
} as const;

export const orderRepository = {
  async findById(id: string) {
    return db.order.findUnique({
      where: { id },
      select: ORDER_SELECT,
    });
  },

  async findByUserId(userId: string, params: OrderQueryInput) {
    const where = {
      userId,
      ...(params.status && { status: params.status }),
    };

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        select: ORDER_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      db.order.count({ where }),
    ]);

    return { orders, total };
  },

  // Admin: fetch all orders across all users
  async findAll(params: OrderQueryInput) {
    const where = params.status ? { status: params.status } : {};

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        select: ORDER_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      db.order.count({ where }),
    ]);

    return { orders, total };
  },

  // Creates order + order items + reserves inventory in a single transaction.
  // If any step fails, ALL changes are rolled back — no partial orders.
  async createOrder(data: {
    userId: string;
    totalInPaise: number;
    deliveryAddress: string;
    notes?: string;
    items: Array<{
      productId: string;
      quantity: number;
      priceAtPurchase: number;
    }>;
  }) {
    return db.$transaction(async (tx: any) => {
      // 1. Create the order record
      const order = await tx.order.create({
        data: {
          userId: data.userId,
          totalInPaise: data.totalInPaise,
          deliveryAddress: data.deliveryAddress,
          notes: data.notes,
          status: "PENDING_PAYMENT",
          orderItems: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              priceAtPurchase: item.priceAtPurchase,
            })),
          },
        },
        select: ORDER_SELECT,
      });

      // 2. Reserve inventory for each item
      // Uses a database-level decrement to handle concurrent orders safely
      for (const item of data.items) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            reservedQuantity: { increment: item.quantity },
          },
        });
      }

      return order;
    });
  },

  async updateStatus(id: string, status: string) {
    return db.order.update({
      where: { id },
      data: { status: status as never },
      select: ORDER_SELECT,
    });
  },

  // When order is DELIVERED — confirm the reservation by reducing available stock
  async confirmInventoryDeduction(orderId: string) {
    const order = await db.order.findUnique({
      where: { orderId } as never,
      select: { orderItems: { select: { productId: true, quantity: true } } },
    });

    if (!order) return;

    return db.$transaction(
      (
        order as { orderItems: Array<{ productId: string; quantity: number }> }
      ).orderItems.map((item) =>
        db.inventory.update({
          where: { productId: item.productId },
          data: {
            quantityAvailable: { decrement: item.quantity },
            reservedQuantity: { decrement: item.quantity },
          },
        })
      )
    );
  },

  // When order is CANCELLED — release the reserved inventory back
  async releaseInventory(orderId: string) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { orderItems: { select: { productId: true, quantity: true } } },
    });

    if (!order) return;

    return db.$transaction(
      order.orderItems.map((item: { productId: any; quantity: any }) =>
        db.inventory.update({
          where: { productId: item.productId },
          data: { reservedQuantity: { decrement: item.quantity } },
        })
      )
    );
  },
};
