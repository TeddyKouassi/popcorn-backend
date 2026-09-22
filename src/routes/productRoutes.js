import { Router } from "express";
import * as productController from "../controllers/productController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { requireAdmin } from "../middlewares/adminMiddleware.js";
import { validate } from "../middlewares/validateMiddleware.js";
import {
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
} from "../validators/productValidator.js";

const router = Router();

// Routes publiques
router.get("/", productController.getProducts);
router.get("/:id", productController.getProductById);

// Routes protégées réservées aux administrateurs
router.post(
  "/",
  authenticate,
  requireAdmin,
  validate(createProductSchema),
  productController.createProduct,
);

router.put(
  "/:id",
  authenticate,
  requireAdmin,
  validate(updateProductSchema),
  productController.updateProduct,
);

router.patch(
  "/:id/stock",
  authenticate,
  requireAdmin,
  validate(updateStockSchema),
  productController.updateStock,
);

router.delete("/:id", authenticate, requireAdmin, productController.deleteProduct);

export default router;
