import { Router } from "express";
import * as categoryController from "../controllers/categoryController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { requireAdmin } from "../middlewares/adminMiddleware.js";

const router = Router();

router.get("/", categoryController.getCategories);
router.post("/", authenticate, requireAdmin, categoryController.createCategory);

export default router;
