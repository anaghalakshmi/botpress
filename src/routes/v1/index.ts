import { Router } from "express";
import healthRoutes from "./health.routes";
import authRoutes from "../../modules/auth/auth.routes";
import {
  categoryRouter,
  productRouter,
} from "../../modules/catalogue/routes/catalogue.routes";
import orderRouter from "../../modules/order/order.routes";
import cartRouter from "../../modules/cart/cart.routes";
import addressRoutes from "../../modules/address/address.routes";
import userRoutes from "../../modules/user/user.routes";
import aiRoutes from "../../modules/ai/ai.routes";
import botRoutes from "../botRoutes";
const v1Router = Router();

// ── Health ─────────────────────────────────────────────────────────────────
v1Router.use("/health", healthRoutes);

// ── Auth ───────────────────────────────────────────────────────────────────
v1Router.use("/auth", authRoutes);

// ── Catalogue ──────────────────────────────────────────────────────────────
v1Router.use("/categories", categoryRouter);
v1Router.use("/products", productRouter);

// ── Coming next ───────────────────────────────────────────────────────────
v1Router.use("/orders", orderRouter);
v1Router.use("/cart", cartRouter);

v1Router.use("/addresses", addressRoutes);
v1Router.use("/users", userRoutes);
v1Router.use("/ai", aiRoutes);
v1Router.use("/bot", botRoutes);
export default v1Router;
