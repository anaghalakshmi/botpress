export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  _count?: { products: number };
}

export interface CreateCategoryDto {
  name: string;
  slug: string;
  imageUrl?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  slug?: string;
  imageUrl?: string;
  isActive?: boolean;
}

// ── Product types ──────────────────────────────────────────────────────────

export interface ProductDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceInPaise: number; // Price stored in smallest unit (paise = 1/100 rupee)
  imageUrl: string | null;
  unit: string; // e.g. "500g", "1L", "dozen"
  isActive: boolean;
  categoryId: string;
  category: { id: string; name: string; slug: string };
  inventory: InventoryDto | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryDto {
  quantityAvailable: number;
  reservedQuantity: number;
  stockStatus: StockStatus;
}

export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export interface CreateProductDto {
  name: string;
  slug: string;
  description?: string;
  priceInPaise: number;
  imageUrl?: string;
  unit: string;
  categoryId: string;
  initialStock?: number;
}

export interface UpdateProductDto {
  name?: string;
  slug?: string;
  description?: string;
  priceInPaise?: number;
  imageUrl?: string;
  unit?: string;
  categoryId?: string;
  isActive?: boolean;
}

export interface UpdateStockDto {
  quantityAvailable: number;
}

// ── Query / filter types ───────────────────────────────────────────────────

export interface ProductFilters {
  categorySlug?: string;
  search?: string; // searches name and description
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  isActive?: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  };
}
