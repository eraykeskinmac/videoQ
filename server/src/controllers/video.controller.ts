import { NextFunction, Request, Response } from "express";
import { VideoService } from "../services/video.service";
import { successResponse } from "../utils/response";

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
}
