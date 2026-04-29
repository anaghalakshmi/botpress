import { Router } from "express";
import {
  listCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controller/catalogue.controller";
import {
  listProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  getProductById,
} from "../controller/catalogue.controller";
import { authenticate } from "../../../middlewares/authenticate";
import { requireAdmin } from "../../../middlewares/authorize";
import { validate } from "../../../middlewares/validate";
import {
  createCategorySchema,
  updateCategorySchema,
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
  productQuerySchema,
  categoryQuerySchema,
  idParamSchema,
  slugParamSchema,
} from "../schemas/catalogue.schemas";

// ── Category routes ────────────────────────────────────────────────────────
export const categoryRouter = Router();

// Public — any visitor can browse categories
categoryRouter.get(
  "/",
  validate({ query: categoryQuerySchema }),
  listCategories
);

categoryRouter.get(
  "/:slug",
  validate({ params: slugParamSchema }),
  getCategoryBySlug
);

// Admin only — create / update / delete categories
categoryRouter.post(
  "/",
  authenticate,
  requireAdmin,
  validate({ body: createCategorySchema }),
  createCategory
);

categoryRouter.patch(
  "/:id",
  authenticate,
  requireAdmin,
  validate({ params: idParamSchema, body: updateCategorySchema }),
  updateCategory
);

categoryRouter.delete(
  "/:id",
  authenticate,
  requireAdmin,
  validate({ params: idParamSchema }),
  deleteCategory
);

// ── Product routes ─────────────────────────────────────────────────────────
export const productRouter = Router();

// Public — customers browse and search products
productRouter.get("/", validate({ query: productQuerySchema }), listProducts);

productRouter.get(
  "/:slug",
  validate({ params: slugParamSchema }),
  getProductBySlug
);

// Admin only — manage product catalogue
productRouter.post(
  "/",
  authenticate,
  requireAdmin,
  validate({ body: createProductSchema }),
  createProduct
);

productRouter.patch(
  "/:id",
  authenticate,
  requireAdmin,
  validate({ params: idParamSchema, body: updateProductSchema }),
  updateProduct
);

productRouter.delete(
  "/:id",
  authenticate,
  requireAdmin,
  validate({ params: idParamSchema }),
  deleteProduct
);

// PATCH /products/:id/stock — separate endpoint for stock management
productRouter.patch(
  "/:id/stock",
  authenticate,
  requireAdmin,
  validate({ params: idParamSchema, body: updateStockSchema }),
  updateStock
);

// router.get("/products/id/:id", getProductById);

productRouter.get(
  "/id/:id",
  validate({ params: idParamSchema }),
  getProductById
);
