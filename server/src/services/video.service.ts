import path from "path";
import { AppDataSource } from "../config/database";
import { Video } from "../entities/video.entity";
import { mkdir } from "fs/promises";
import youtubeDl from "youtube-dl-exec";
import ffmpeg from "@ffmpeg-installer/ffmpeg";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../utils/error";
import ytdl from "ytdl-core";
import logger from "../utils/logger";

export interface VideoInfo {
  title: string;
  description: string;
  duration: number;
  author: string;
  videoUrl: string;
  thumbnail: string;
  audioPath?: string;
}

type YoutubeDLOutput = {
  title: string;
  description: string;
  duration: number;
  uploader: string;
  thumbnail: string;
} & Record<string, unknown>;

export class VideoService {
  private static readonly AUDIO_DIR = path.join(process.cwd(), "temp", "audio");
  private static readonly videoRepository = AppDataSource.getRepository(Video);

  static async ensureDirExists() {
    await mkdir(VideoService.AUDIO_DIR, { recursive: true });
  }

  static async getVideoInfo(url: string): Promise<VideoInfo> {
    try {
      const rawInfo = await youtubeDl(url, {
        dumpSingleJson: true,
        noWarnings: true,
        preferFreeFormats: true,
        ffmpegLocation: ffmpeg.path,
      });

      const info = rawInfo as YoutubeDLOutput;

      if (!info.title || !info.uploader || typeof info.duration !== "number") {
        throw new AppError(StatusCodes.BAD_REQUEST, "Invalid video info");
      }

      const thumbnail =
        info.thumbnail ||
        (info as any).thumbnails?.[0]?.url ||
        `https://i.ytimg.com/vi/${ytdl.getVideoID(url)}/maxresdefault.jpg`;

      return {
        title: info.title,
        description: info.description || "",
        duration: info.duration,
        author: info.uploader,
        videoUrl: url,
        thumbnail: thumbnail,
      };
    } catch (error) {
      logger.error("Error getting video info", { error });
      if (error instanceof Error) {
        if (error.message.includes("Private video")) {
          throw new AppError(StatusCodes.FORBIDDEN, "This video is private");
        }
        if (error.message.includes("not_available")) {
          throw new AppError(StatusCodes.NOT_FOUND, "Video not found");
        }
        throw new AppError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Failed to get video info"
        );
      }
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to get video info"
      );
    }
  }
}
