import { Router } from "express";
import * as adminController from "../controllers/adminController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { requireAdmin } from "../middlewares/adminMiddleware.js";

const router = Router();

router.get("/stats", authenticate, requireAdmin, adminController.getDashboardStats);

export default router;
