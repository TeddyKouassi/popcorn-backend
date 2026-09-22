import { Router } from "express";
import * as contactController from "../controllers/contactController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { requireAdmin } from "../middlewares/adminMiddleware.js";
import { validate } from "../middlewares/validateMiddleware.js";
import { contactMessageSchema } from "../validators/contactValidator.js";

const router = Router();

router.post("/", validate(contactMessageSchema), contactController.submitContactMessage);
router.get("/", authenticate, requireAdmin, contactController.getContactMessages);
router.patch("/:id/read", authenticate, requireAdmin, contactController.markMessageAsRead);

export default router;
