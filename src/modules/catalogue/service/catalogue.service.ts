import {
  categoryRepository,
  productRepository,
  deriveStockStatus,
} from "../repository/catalogue.repository";
import { AppError } from "../../../types";
import type {
  CategoryDto,
  ProductDto,
  PaginatedResult,
} from "../catalogue.types";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateProductInput,
  UpdateProductInput,
  UpdateStockInput,
  ProductQueryInput,
  CategoryQueryInput,
} from "../schemas/catalogue.schemas";

// ── Category service ───────────────────────────────────────────────────────

export const categoryService = {
  async listCategories(
    params: CategoryQueryInput
  ): Promise<PaginatedResult<CategoryDto>> {
    const { categories, total } = await categoryRepository.findAll({
      page: params.page,
      limit: params.limit,
      activeOnly: true,
    });

    return {
      data: categories.map(formatCategory),
      meta: {
        total,
        page: params.page,
        limit: params.limit,
        hasNext: params.page * params.limit < total,
      },
    };
  },

  async getCategoryBySlug(slug: string): Promise<CategoryDto> {
    const category = await categoryRepository.findBySlug(slug);
    if (!category) throw AppError.notFound(`Category '${slug}'`);
    return formatCategory(category);
  },

  async createCategory(data: CreateCategoryInput): Promise<CategoryDto> {
    // Enforce slug uniqueness — slugs become part of URLs
    const slugTaken = await categoryRepository.slugExists(data.slug);
    if (slugTaken) {
      throw AppError.conflict(
        `Slug '${data.slug}' is already in use. Choose a different slug.`,
        "SLUG_ALREADY_EXISTS"
      );
    }

    const category = await categoryRepository.create(data);
    return formatCategory(category);
  },

  async updateCategory(
    id: string,
    data: UpdateCategoryInput
  ): Promise<CategoryDto> {
    const existing = await categoryRepository.findById(id);
    if (!existing) throw AppError.notFound("Category");

    // Only check slug uniqueness if slug is being changed
    if (data.slug && data.slug !== existing.slug) {
      const slugTaken = await categoryRepository.slugExists(data.slug, id);
      if (slugTaken) {
        throw AppError.conflict(
          `Slug '${data.slug}' is already in use.`,
          "SLUG_ALREADY_EXISTS"
        );
      }
    }

    const updated = await categoryRepository.update(id, data);
    return formatCategory(updated);
  },

  async deleteCategory(id: string): Promise<void> {
    const existing = await categoryRepository.findById(id);
    if (!existing) throw AppError.notFound("Category");

    // Prevent deleting a category that still has products — would orphan them
    const hasProducts = await categoryRepository.hasProducts(id);
    if (hasProducts) {
      throw AppError.conflict(
        "Cannot delete a category that contains products. Move or delete the products first.",
        "CATEGORY_HAS_PRODUCTS"
      );
    }

    await categoryRepository.delete(id);
  },
};

// ── Product service ────────────────────────────────────────────────────────

export const productService = {
  async listProducts(
    params: ProductQueryInput
  ): Promise<PaginatedResult<ProductDto>> {
    const { products, total } = await productRepository.findAll(params);

    return {
      data: products.map(formatProduct),
      meta: {
        total,
        page: params.page,
        limit: params.limit,
        hasNext: params.page * params.limit < total,
      },
    };
  },

  async getProductBySlug(slug: string): Promise<ProductDto> {
    const product = await productRepository.findBySlug(slug);
    if (!product || !product.isActive)
      throw AppError.notFound(`Product '${slug}'`);
    return formatProduct(product);
  },

  async getProductById(id: string): Promise<ProductDto> {
    const product = await productRepository.findById(id);
    if (!product) throw AppError.notFound("Product");
    return formatProduct(product);
  },

  async createProduct(data: CreateProductInput): Promise<ProductDto> {
    // Validate slug uniqueness
    const slugTaken = await productRepository.slugExists(data.slug);
    if (slugTaken) {
      throw AppError.conflict(
        `Slug '${data.slug}' is already in use.`,
        "SLUG_ALREADY_EXISTS"
      );
    }

    // Validate category exists before creating product
    const category = await categoryRepository.findById(data.categoryId);
    if (!category) {
      throw AppError.notFound(`Category with id '${data.categoryId}'`);
    }
    if (!category.isActive) {
      throw AppError.badRequest(
        "Cannot add products to an inactive category.",
        "CATEGORY_INACTIVE"
      );
    }

    const product = await productRepository.create(data);
    return formatProduct(product);
  },

  async updateProduct(
    id: string,
    data: UpdateProductInput
  ): Promise<ProductDto> {
    const existing = await productRepository.findById(id);
    if (!existing) throw AppError.notFound("Product");

    if (data.slug && data.slug !== existing.slug) {
      const slugTaken = await productRepository.slugExists(data.slug, id);
      if (slugTaken) {
        throw AppError.conflict(
          `Slug '${data.slug}' is already in use.`,
          "SLUG_ALREADY_EXISTS"
        );
      }
    }

    if (data.categoryId && data.categoryId !== existing.categoryId) {
      const category = await categoryRepository.findById(data.categoryId);
      if (!category)
        throw AppError.notFound(`Category with id '${data.categoryId}'`);
    }

    const updated = await productRepository.update(id, data);
    return formatProduct(updated);
  },

  async deleteProduct(id: string): Promise<void> {
    const existing = await productRepository.findById(id);
    if (!existing) throw AppError.notFound("Product");

    // Soft delete preferred — deactivate rather than hard delete to preserve order history
    await productRepository.update(id, { isActive: false });
  },

  async updateStock(
    productId: string,
    data: UpdateStockInput
  ): Promise<ProductDto> {
    const product = await productRepository.findById(productId);
    if (!product) throw AppError.notFound("Product");

    await productRepository.updateStock(productId, data.quantityAvailable);

    const updated = await productRepository.findById(productId);
    return formatProduct(updated!);
  },
};

// ── Response formatters ────────────────────────────────────────────────────
// Shape raw Prisma results into the clean DTO types the API returns.
// Any future DB schema changes only require updating these two functions.

type RawCategory = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  _count?: { products: number };
};

function formatCategory(raw: RawCategory): CategoryDto {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    imageUrl: raw.imageUrl,
    isActive: raw.isActive,
    createdAt: raw.createdAt,
    _count: raw._count,
  };
}

type RawProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceInPaise: number;
  imageUrl: string | null;
  unit: string;
  isActive: boolean;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
  category: { id: string; name: string; slug: string };
  inventory: { quantityAvailable: number; reservedQuantity: number } | null;
};

function formatProduct(raw: RawProduct): ProductDto {
  const inv = raw.inventory;
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    priceInPaise: raw.priceInPaise,
    imageUrl: raw.imageUrl,
    unit: raw.unit,
    isActive: raw.isActive,
    categoryId: raw.categoryId,
    category: raw.category,
    inventory: inv
      ? {
          quantityAvailable: inv.quantityAvailable,
          reservedQuantity: inv.reservedQuantity,
          stockStatus: deriveStockStatus(
            inv.quantityAvailable,
            inv.reservedQuantity
          ),
        }
      : null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}
