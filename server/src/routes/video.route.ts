import { Router } from "express";
import { VideoController } from "../controllers/video.controller";

const router = Router();

router.post("/info", VideoController.getVideoInfo);

export default router;
