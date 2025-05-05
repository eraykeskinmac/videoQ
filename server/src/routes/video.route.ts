import { Router } from "express";
import { VideoController } from "../controllers/video.controller";
import { validateYoutubeUrl } from "../middleware/validateUrl";

const router = Router();

router.post("/info", validateYoutubeUrl, VideoController.getVideoInfo);
router.post("/audio", validateYoutubeUrl, VideoController.downloadAudio);

export default router;
