import { Router } from "express";
import * as invoiceController from "../controllers/invoiceController.js";
import { optionalAuthenticate } from "../middlewares/authMiddleware.js";

const router = Router();

// Téléchargement sécurisé de la facture PDF
router.get("/:orderId/download", optionalAuthenticate, invoiceController.downloadInvoice);

export default router;
