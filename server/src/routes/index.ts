import { Router } from "express";
import healthRoutes from "./health.routes";
import authRoutes from "./auth.routes";
import videoRoutes from "./video.route";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/video", videoRoutes);

export default router;
