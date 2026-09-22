import { Router } from "express";
import * as orderController from "../controllers/orderController.js";
import {
  authenticate,
  optionalAuthenticate,
} from "../middlewares/authMiddleware.js";
import { requireAdmin } from "../middlewares/adminMiddleware.js";
import { validate } from "../middlewares/validateMiddleware.js";
import {
  createOrderSchema,
  updateOrderStatusSchema,
} from "../validators/orderValidator.js";

const router = Router();

// Création d'une commande (peut être invité ou utilisateur connecté via optionalAuthenticate)
router.post(
  "/",
  optionalAuthenticate,
  validate(createOrderSchema),
  orderController.createOrder,
);

// Suivi public d'une commande par son numéro officiel (ex: POP-2026-1001)
router.get("/track/:orderNumber", orderController.trackOrder);

// Commandes de l'utilisateur connecté
router.get("/my-orders", authenticate, orderController.getMyOrders);

// Détail d'une commande spécifique
router.get("/:id", optionalAuthenticate, orderController.getOrderById);

// Routes d'administration des commandes
router.get("/", authenticate, requireAdmin, orderController.getAllOrders);
router.patch(
  "/:id/status",
  authenticate,
  requireAdmin,
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatus,
);

export default router;
