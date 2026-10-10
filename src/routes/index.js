import { Router } from "express";
import authRoutes from "./authRoutes.js";
import productRoutes from "./productRoutes.js";
import categoryRoutes from "./categoryRoutes.js";
import orderRoutes from "./orderRoutes.js";
import contactRoutes from "./contactRoutes.js";
import adminRoutes from "./adminRoutes.js";
import invoiceRoutes from "./invoiceRoutes.js";
import paymentRoutes from "./paymentRoutes.js";

const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/products", productRoutes);
apiRouter.use("/categories", categoryRoutes);
apiRouter.use("/orders", orderRoutes);
apiRouter.use("/contact", contactRoutes);
apiRouter.use("/admin", adminRoutes);
apiRouter.use("/invoices", invoiceRoutes);
apiRouter.use("/payments", paymentRoutes);

// Route de santé (Health Check)
apiRouter.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "PopCorn API est opérationnelle.",
    timestamp: new Date().toISOString(),
  });
});

export default apiRouter;
