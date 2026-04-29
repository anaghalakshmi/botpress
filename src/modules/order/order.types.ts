// ── Cart types ─────────────────────────────────────────────────────────────

export interface CartItemDto {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    priceInPaise: number;
    imageUrl: string | null;
    unit: string;
    stockStatus: string;
    availableQty: number;
  };
  subtotalInPaise: number; // quantity × priceInPaise
}

export interface CartDto {
  id: string;
  userId: string;
  items: CartItemDto[];
  totalInPaise: number;
  totalItems: number; // total unique products
  totalQuantity: number; // sum of all quantities
}

// ── Order types ────────────────────────────────────────────────────────────

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PICKING"
  | "DISPATCHED"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderItemDto {
  id: string;
  productId: string;
  quantity: number;
  priceAtPurchase: number; // locked-in price at time of order
  subtotalInPaise: number;
  product: {
    id: string;
    name: string;
    slug: string;
    unit: string;
    imageUrl: string | null;
  };
}

export interface OrderDto {
  id: string;
  userId: string;
  status: OrderStatus;
  totalInPaise: number;
  deliveryAddress: string;
  notes: string | null;
  items: OrderItemDto[];
  createdAt: Date;
  updatedAt: Date;
}

// ── Valid order status transitions ─────────────────────────────────────────
// Defines the allowed state machine — prevents jumping from DELIVERED → CONFIRMED
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PICKING", "CANCELLED"],
  PICKING: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["DELIVERED"],
  DELIVERED: [], // terminal state
  CANCELLED: [], // terminal state
};
