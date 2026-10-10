import { Router } from "express";
import * as paymentController from "../controllers/paymentController.js";
import { optionalAuthenticate } from "../middlewares/authMiddleware.js";

const router = Router();

// Initialisation d'une session de paiement SasPay Checkout
router.post(
  "/saspay/initialize/:orderId",
  optionalAuthenticate,
  paymentController.initializeSasPaySession,
);

// Vérification de l'état réel d'un paiement SasPay
router.get(
  "/saspay/verify/:orderId",
  optionalAuthenticate,
  paymentController.verifySasPayPayment,
);

// Webhook IPN SasPay (Notifications serveur à serveur sécurisées par HMAC)
router.post(
  "/saspay/webhook",
  paymentController.handleSasPayWebhook,
);

export default router;

