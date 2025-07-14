import { Router } from "express";
import { VideoController } from "../controllers/video.controller";
import { validateYoutubeUrl } from "../middleware/validateUrl";

const router = Router();
router.get("/user", VideoController.getUserVideos);

router.get("/:id", VideoController.getVideoById);

router.post("/info", validateYoutubeUrl, VideoController.getVideoInfo);

router.post("/audio", validateYoutubeUrl, VideoController.downloadAudio);

router.post("/jobs/running", VideoController.getAllJobs);

router.post("/transcribe", VideoController.transcribeVideo);

router.get("/transcribe/:jobId/status", VideoController.getTranscriptionStatus);

export default router;
