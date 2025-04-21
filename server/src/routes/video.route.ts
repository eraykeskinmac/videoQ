import { Router } from "express";
import { VideoController } from "../controllers/video.controller";
import { validateYoutubeUrl } from "../middleware/validateUrl";

const router = Router();

router.post("/info", validateYoutubeUrl, VideoController.getVideoInfo);

export default router;
