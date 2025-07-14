import { NextFunction, Request, Response } from "express";
import { VideoService } from "../services/video.service";
import { successResponse } from "../utils/response";
import { AuthService } from "../services/auth.service";
import { JobsService } from "../services/job.service";
import { AppError } from "../utils/error";
import { StatusCodes } from "http-status-codes";

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

  static async getTranscriptionStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { jobId } = req.params;
      const status = await JobsService.getJobStatus(jobId);
      res.json(successResponse({ status }));
    } catch (error) {
      next(error);
    }
  }

  static async getUserVideos(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const videos = await VideoService.getUserVideos(userId!);

      const transformedVideos = videos.map((video) => ({
        id: video.id,
        url: video.url,
        title: video.title,
        description: video.description,
        duration: video.duration,
        author: video.author,
        thumbnail: video.thumbnail,
        status: video.status,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt,
        transcription: video.transcription
          ? {
              text: video.transcription.text,
              confidence: video.transcription.confidence,
              isMusic: video.transcription.isMusic,
              createdAt: video.transcription.createdAt,
            }
          : null,
        analysis: video.analysis
          ? {
              summary: video.analysis.summary,
              keyPoints: video.analysis.keyPoints,
              sentiment: video.analysis.sentiment,
              topics: video.analysis.topics,
              suggestedTags: video.analysis.suggestedTags,
              createdAt: video.analysis.createdAt,
            }
          : null,
      }));

      res.json(successResponse(transformedVideos));
    } catch (error) {
      next(error);
    }
  }

  static async getVideoById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const video = await VideoService.getVideoById(id, userId!);
      if (!video) {
        throw new AppError(StatusCodes.NOT_FOUND, "Video not found");
      }

      // transform the response to include only necessary fields
      const transformedVideo = {
        id: video.id,
        url: video.url,
        title: video.title,
        description: video.description,
        duration: video.duration,
        author: video.author,
        thumbnail: video.thumbnail,
        status: video.status,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt,
        transcription: video.transcription
          ? {
              text: video.transcription.text,
              confidence: video.transcription.confidence,
              isMusic: video.transcription.isMusic,
              createdAt: video.transcription.createdAt,
            }
          : null,
        analysis: video.analysis
          ? {
              summary: video.analysis.summary,
              keyPoints: video.analysis.keyPoints,
              sentiment: video.analysis.sentiment,
              topics: video.analysis.topics,
              suggestedTags: video.analysis.suggestedTags,
              createdAt: video.analysis.createdAt,
            }
          : null,
      };

      res.json(successResponse(transformedVideo));
    } catch (error) {
      next(error);
    }
  }

  static async getAllJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const jobs = await JobsService.getAllJobs(userId!);
      res.json(successResponse(jobs));
    } catch (error) {
      next(error);
    }
  }
}
