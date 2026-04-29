import { z } from "zod";

// ── Shared helpers ─────────────────────────────────────────────────────────
// Slug: lowercase letters, numbers, hyphens only — safe for URLs
const slugSchema = z
  .string()
  .min(2, "Slug must be at least 2 characters")
  .max(100, "Slug must be under 100 characters")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Slug must be lowercase with hyphens only (e.g. "fresh-milk")'
  )
  .trim();

const uuidSchema = z.string().uuid("Must be a valid UUID");

// ── Category schemas ───────────────────────────────────────────────────────
export const createCategorySchema = z.object({
  name: z
    .string({ required_error: "Category name is required" })
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters")
    .trim(),

  slug: slugSchema,

  imageUrl: z.string().url("Image URL must be a valid URL").optional(),
});

export const updateCategorySchema = z
  .object({
    name: z.string().min(2).max(100).trim().optional(),
    slug: slugSchema.optional(),
    imageUrl: z.string().url().optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

// ── Product schemas ────────────────────────────────────────────────────────
export const createProductSchema = z.object({
  name: z
    .string({ required_error: "Product name is required" })
    .min(2, "Name must be at least 2 characters")
    .max(200, "Name must be under 200 characters")
    .trim(),

  slug: slugSchema,

  description: z
    .string()
    .max(2000, "Description must be under 2000 characters")
    .trim()
    .optional(),

  // Price in paise (1 rupee = 100 paise) — integer only, avoids floating point
  priceInPaise: z
    .number({ required_error: "Price is required" })
    .int("Price must be a whole number in paise")
    .min(1, "Price must be at least 1 paise")
    .max(10_000_000, "Price exceeds maximum allowed value"),

  imageUrl: z.string().url("Image URL must be a valid URL").optional(),

  unit: z
    .string({ required_error: "Unit is required (e.g. 500g, 1L, dozen)" })
    .min(1)
    .max(50)
    .trim(),

  categoryId: uuidSchema.describe("Category UUID"),

  initialStock: z
    .number()
    .int("Stock must be a whole number")
    .min(0, "Stock cannot be negative")
    .default(0),
});

export const updateProductSchema = z
  .object({
    name: z.string().min(2).max(200).trim().optional(),
    slug: slugSchema.optional(),
    description: z.string().max(2000).trim().optional().nullable(),
    priceInPaise: z.number().int().min(1).max(10_000_000).optional(),
    imageUrl: z.string().url().optional().nullable(),
    unit: z.string().min(1).max(50).trim().optional(),
    categoryId: uuidSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const updateStockSchema = z.object({
  quantityAvailable: z
    .number({ required_error: "Quantity is required" })
    .int("Quantity must be a whole number")
    .min(0, "Quantity cannot be negative"),
});

// ── Query schemas ──────────────────────────────────────────────────────────
// Used for GET /products?page=1&limit=20&category=dairy&search=milk
export const productQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    categorySlug: z.string().trim().optional(),
    search: z.string().max(100).trim().optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    inStockOnly: z.coerce.boolean().default(false),
  })
  .refine(
    (data) =>
      !data.minPrice || !data.maxPrice || data.minPrice <= data.maxPrice,
    { message: "minPrice cannot be greater than maxPrice", path: ["minPrice"] }
  );

export const categoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const idParamSchema = z.object({
  id: uuidSchema,
});

export const slugParamSchema = z.object({
  slug: slugSchema,
});

// ── Inferred types ─────────────────────────────────────────────────────────
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type UpdateStockInput = z.infer<typeof updateStockSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
export type CategoryQueryInput = z.infer<typeof categoryQuerySchema>;
