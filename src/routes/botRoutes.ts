// // src/routes/botRoutes.ts
// // Optional: Dedicated lightweight routes for the Botpress bot
// // These skip the full auth middleware and use the bot secret instead
// // Mount as: app.use('/api/bot', botRoutes)

// import { Router } from "express";
// import { db } from "../lib/db";
// import { botAuth } from "../middlewares/botAuth";

// const router = Router();

// // Apply bot auth to all routes in this file
// router.use(botAuth);

// // ── GET /api/bot/products ──────────────────────────────────────────────────
// // Lightweight product search for the bot (no pagination overhead)
// router.get("/products", async (req, res) => {
//   try {
//     const {
//       search,
//       categorySlug,
//       limit = 8,
//     } = req.query as Record<string, string>;

//     const where: Record<string, unknown> = { isActive: true };

//     if (search) {
//       where["OR"] = [
//         { name: { contains: search, mode: "insensitive" } },
//         { description: { contains: search, mode: "insensitive" } },
//       ];
//     }

//     if (categorySlug) {
//       where["category"] = { slug: categorySlug };
//     }

//     const products = await db.product.findMany({
//       where,
//       select: {
//         id: true,
//         name: true,
//         slug: true,
//         priceInPaise: true,
//         unit: true,
//         imageUrl: true,
//         category: { select: { name: true, slug: true } },
//         inventory: {
//           select: { quantityAvailable: true, reservedQuantity: true },
//         },
//       },
//       orderBy: { name: "asc" },
//       take: parseInt(String(limit), 10) || 8,
//     });

//     res.json({
//       success: true,
//       data: products.map((p) => ({
//         ...p,
//         inStock:
//           (p.inventory?.quantityAvailable ?? 0) -
//             (p.inventory?.reservedQuantity ?? 0) >
//           0,
//       })),
//     });
//   } catch {
//     res
//       .status(500)
//       .json({ success: false, error: { message: "Failed to fetch products" } });
//   }
// });

// // ── GET /api/bot/categories ────────────────────────────────────────────────
// router.get("/categories", async (_req, res) => {
//   try {
//     const cats = await db.category.findMany({
//       where: { isActive: true },
//       select: {
//         id: true,
//         name: true,
//         slug: true,
//         _count: { select: { products: true } },
//       },
//       orderBy: { name: "asc" },
//     });
//     res.json({ success: true, data: cats });
//   } catch {
//     res.status(500).json({
//       success: false,
//       error: { message: "Failed to fetch categories" },
//     });
//   }
// });

// export default router;
import { Router } from "express";
import { db } from "../lib/db";
import { botAuth } from "../middlewares/botAuth";

const router = Router();

// GET /api/v1/bot/products
router.get("/products", botAuth, async (req, res) => {
  try {
    const search = (req.query.search as string)?.trim().toLowerCase();
    const limit = parseInt(req.query.limit as string) || 10;

    const where: any = {
      isActive: true,
    };

    if (search) {
      const tokens = search.split(/\s+/);

      where.OR = tokens.flatMap((token) => [
        { name: { contains: token, mode: "insensitive" } },
        { description: { contains: token, mode: "insensitive" } },
        { category: { name: { contains: token, mode: "insensitive" } } },
      ]);
    }

    const products = await db.product.findMany({
      where,
      take: limit,
      include: { category: true, inventory: true },
    });

    res.json({ success: true, data: products });
  } catch (error) {
    console.error("PRODUCT FETCH ERROR:", error);
    throw error;
  }
});

export default router;
