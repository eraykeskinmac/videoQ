import { NextFunction, Request, Response } from "express";
import { VideoService } from "../services/video.service";
import { successResponse } from "../utils/response";
import { AuthService } from "../services/auth.service";
import { JobsService } from "../services/job.service";

export class VideoController {
  static async getVideoInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const { url } = req.body;
      const videoInfo = await VideoService.getVideoInfo(url);

      res.json(successResponse(videoInfo));
    } catch (error) {
      next(error);
    }
  }

  static async downloadAudio(req: Request, res: Response, next: NextFunction) {
    try {
      const { url } = req.body;
      const videoInfo = await VideoService.getVideoInfo(url);
      const audioPath = await VideoService.downloadAudio(url);

      res.json(
        successResponse({
          ...videoInfo,
          audioPath,
          message: "Audio downloaded successfully",
        })
      );
    } catch (error) {
      next(error);
    }
  }

  static async transcribeVideo(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { url } = req.body;
      const userId = req.user?.userId;

      const user = await AuthService.getUserById(userId!);
      const videoInfo = await VideoService.getVideoInfo(url);

      const { jobId } = await JobsService.addTranscriptionJob(
        url,
        videoInfo,
        user
      );

      res.json(
        successResponse({
          jobId,
          videoInfo,
          message: "Transcription job added successfully",
        })
      );
    } catch (error) {
      next(error);
    }
  }
}
