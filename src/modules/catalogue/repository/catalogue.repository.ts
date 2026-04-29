import { db } from "../../../lib/db";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateProductInput,
  UpdateProductInput,
  ProductQueryInput,
} from "../schemas/catalogue.schemas";
import type { StockStatus } from "../catalogue.types";

// ── Category repository ────────────────────────────────────────────────────

export const categoryRepository = {
  async findAll(params: { page: number; limit: number; activeOnly?: boolean }) {
    const { page, limit, activeOnly = true } = params;
    const where = activeOnly ? { isActive: true } : {};

    const [categories, total] = await Promise.all([
      db.category.findMany({
        where,
        include: { _count: { select: { products: true } } },
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.category.count({ where }),
    ]);

    return { categories, total };
  },

  async findById(id: string) {
    return db.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
  },

  async findBySlug(slug: string) {
    return db.category.findUnique({
      where: { slug },
      include: { _count: { select: { products: true } } },
    });
  },

  async slugExists(slug: string, excludeId?: string) {
    const category = await db.category.findUnique({ where: { slug } });
    if (!category) return false;
    return category.id !== excludeId;
  },

  async create(data: CreateCategoryInput) {
    return db.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        imageUrl: data.imageUrl,
      },
      include: { _count: { select: { products: true } } },
    });
  },

  async update(id: string, data: UpdateCategoryInput) {
    return db.category.update({
      where: { id },
      data,
      include: { _count: { select: { products: true } } },
    });
  },

  async delete(id: string) {
    return db.category.delete({ where: { id } });
  },

  async hasProducts(id: string): Promise<boolean> {
    const count = await db.product.count({ where: { categoryId: id } });
    return count > 0;
  },
};

// ── Product repository ─────────────────────────────────────────────────────

// The full product select shape — used consistently across all queries
const PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  priceInPaise: true,
  imageUrl: true,
  unit: true,
  isActive: true,
  categoryId: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: { id: true, name: true, slug: true },
  },
  inventory: {
    select: { quantityAvailable: true, reservedQuantity: true },
  },
} as const;

export const productRepository = {
  async findAll(params: ProductQueryInput) {
    const {
      page,
      limit,
      categorySlug,
      search,
      minPrice,
      maxPrice,
      inStockOnly,
    } = params;

    // Build dynamic where clause
    const where: Record<string, unknown> = { isActive: true };

    if (categorySlug) {
      where["category"] = { slug: categorySlug };
    }

    if (search) {
      where["OR"] = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where["priceInPaise"] = {
        ...(minPrice !== undefined && { gte: minPrice }),
        ...(maxPrice !== undefined && { lte: maxPrice }),
      };
    }

    if (inStockOnly) {
      where["inventory"] = { quantityAvailable: { gt: 0 } };
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        select: PRODUCT_SELECT,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.product.count({ where }),
    ]);

    return { products, total };
  },

  async findById(id: string) {
    return db.product.findUnique({
      where: { id },
      select: PRODUCT_SELECT,
    });
  },

  async findBySlug(slug: string) {
    return db.product.findUnique({
      where: { slug },
      select: PRODUCT_SELECT,
    });
  },

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const product = await db.product.findUnique({ where: { slug } });
    if (!product) return false;
    return product.id !== excludeId;
  },

  async create(data: CreateProductInput) {
    // Create product and its inventory record in a single transaction
    return db.$transaction(
      async (tx: {
        product: {
          create: (arg0: {
            data: {
              name: string;
              slug: string;
              description: string | undefined;
              priceInPaise: number;
              imageUrl: string | undefined;
              unit: string;
              categoryId: string;
            };
            select: {
              readonly id: true;
              readonly name: true;
              readonly slug: true;
              readonly description: true;
              readonly priceInPaise: true;
              readonly imageUrl: true;
              readonly unit: true;
              readonly isActive: true;
              readonly categoryId: true;
              readonly createdAt: true;
              readonly updatedAt: true;
              readonly category: {
                readonly select: {
                  readonly id: true;
                  readonly name: true;
                  readonly slug: true;
                };
              };
              readonly inventory: {
                readonly select: {
                  readonly quantityAvailable: true;
                  readonly reservedQuantity: true;
                };
              };
            };
          }) => any;
          findUniqueOrThrow: (arg0: {
            where: { id: any };
            select: {
              readonly id: true;
              readonly name: true;
              readonly slug: true;
              readonly description: true;
              readonly priceInPaise: true;
              readonly imageUrl: true;
              readonly unit: true;
              readonly isActive: true;
              readonly categoryId: true;
              readonly createdAt: true;
              readonly updatedAt: true;
              readonly category: {
                readonly select: {
                  readonly id: true;
                  readonly name: true;
                  readonly slug: true;
                };
              };
              readonly inventory: {
                readonly select: {
                  readonly quantityAvailable: true;
                  readonly reservedQuantity: true;
                };
              };
            };
          }) => any;
        };
        inventory: {
          create: (arg0: {
            data: {
              productId: any;
              quantityAvailable: number;
              reservedQuantity: number;
            };
          }) => any;
        };
      }) => {
        const product = await tx.product.create({
          data: {
            name: data.name,
            slug: data.slug,
            description: data.description,
            priceInPaise: data.priceInPaise,
            imageUrl: data.imageUrl,
            unit: data.unit,
            categoryId: data.categoryId,
          },
          select: PRODUCT_SELECT,
        });

        // Always create an inventory record alongside the product
        await tx.inventory.create({
          data: {
            productId: product.id,
            quantityAvailable: data.initialStock ?? 0,
            reservedQuantity: 0,
          },
        });

        // Re-fetch to include the newly created inventory
        return tx.product.findUniqueOrThrow({
          where: { id: product.id },
          select: PRODUCT_SELECT,
        });
      }
    );
  },

  async update(id: string, data: UpdateProductInput) {
    return db.product.update({
      where: { id },
      data,
      select: PRODUCT_SELECT,
    });
  },

  async delete(id: string) {
    return db.product.delete({ where: { id } });
  },

  async updateStock(productId: string, quantityAvailable: number) {
    return db.inventory.update({
      where: { productId },
      data: { quantityAvailable },
    });
  },

  async findByCategoryId(categoryId: string) {
    return db.product.count({ where: { categoryId, isActive: true } });
  },
};

// ── Stock status helper ────────────────────────────────────────────────────
// Shared logic for deriving stock status from raw inventory numbers
export function deriveStockStatus(
  quantityAvailable: number,
  reservedQuantity: number
): StockStatus {
  const available = quantityAvailable - reservedQuantity;
  if (available <= 0) return "OUT_OF_STOCK";
  if (available <= 5) return "LOW_STOCK";
  return "IN_STOCK";
}
