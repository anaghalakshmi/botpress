import type { Request, Response } from "express";
import { categoryService, productService } from "../service/catalogue.service";
import { asyncHandler } from "../../../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../../../utils/response";

// ══════════════════════════════════════════════════════════════════════════
// CATEGORY CONTROLLERS
// ══════════════════════════════════════════════════════════════════════════

// GET /api/v1/categories
export const listCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await categoryService.listCategories(req.query as never);
    res.json({ success: true, ...result });
  }
);

// GET /api/v1/categories/:slug
export const getCategoryBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const category = await categoryService.getCategoryBySlug(
      req.params["slug"]!
    );
    sendSuccess(res, { category });
  }
);

// POST /api/v1/categories  [admin only]
export const createCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const category = await categoryService.createCategory(req.body);
    sendSuccess(res, { category }, "Category created successfully.", 201);
  }
);

// PATCH /api/v1/categories/:id  [admin only]
export const updateCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const category = await categoryService.updateCategory(
      req.params["id"]!,
      req.body
    );
    sendSuccess(res, { category }, "Category updated successfully.");
  }
);

// DELETE /api/v1/categories/:id  [admin only]
export const deleteCategory = asyncHandler(
  async (req: Request, res: Response) => {
    await categoryService.deleteCategory(req.params["id"]!);
    sendSuccess(res, null, "Category deleted successfully.");
  }
);

// ══════════════════════════════════════════════════════════════════════════
// PRODUCT CONTROLLERS
// ══════════════════════════════════════════════════════════════════════════

// GET /api/v1/products
// Supports: ?page=1&limit=20&categorySlug=dairy&search=milk&inStockOnly=true
export const listProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await productService.listProducts(req.query as never);
    // Use sendPaginated so the response envelope includes meta.total/hasNext
    sendPaginated(res, result.data, result.meta);
  }
);

// GET /api/v1/products/:slug
export const getProductBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const product = await productService.getProductBySlug(req.params["slug"]!);
    sendSuccess(res, { product });
  }
);

// POST /api/v1/products  [admin only]
export const createProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const product = await productService.createProduct(req.body);
    sendSuccess(res, { product }, "Product created successfully.", 201);
  }
);

// PATCH /api/v1/products/:id  [admin only]
export const updateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const product = await productService.updateProduct(
      req.params["id"]!,
      req.body
    );
    sendSuccess(res, { product }, "Product updated successfully.");
  }
);

// DELETE /api/v1/products/:id  [admin only]
// Soft deletes (sets isActive = false) — preserves order history
export const deleteProduct = asyncHandler(
  async (req: Request, res: Response) => {
    await productService.deleteProduct(req.params["id"]!);
    sendSuccess(res, null, "Product deactivated successfully.");
  }
);

// PATCH /api/v1/products/:id/stock  [admin only]
export const updateStock = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.updateStock(req.params["id"]!, req.body);
  sendSuccess(res, { product }, "Stock updated successfully.");
});

// GET /api/v1/products/id/:id
export const getProductById = asyncHandler(
  async (req: Request, res: Response) => {
    const product = await productService.getProductById(req.params["id"]!);
    sendSuccess(res, { product });
  }
);
