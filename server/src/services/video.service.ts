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

  static async getUserVideos(userId: string): Promise<Video[]> {
    return this.videoRepository.find({
      where: {
        user: { id: userId },
      },
      relations: ["transcription", "analysis"],
      order: { createdAt: "DESC" },
    });
  }

  static async getVideoById(id: string, userId: string): Promise<Video | null> {
    const video = await this.videoRepository.findOne({
      where: { id, user: { id: userId } },
      relations: ["transcription", "analysis"],
    });

    if (!video) {
      throw new AppError(StatusCodes.NOT_FOUND, "Video not found");
    }

    return video;
  }

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

  static async downloadAudio(url: string): Promise<string> {
    try {
      await this.ensureDirExists();

      const videoId = ytdl.getVideoID(url);
      const audioPath = path.join(this.AUDIO_DIR, `${videoId}.mp3`);

      await youtubeDl(url, {
        extractAudio: true,
        audioFormat: "mp3",
        audioQuality: 0,
        output: audioPath,
        noWarnings: true,
        ffmpegLocation: ffmpeg.path,
      });

      const fileStats = await import("fs/promises").then((fs) =>
        fs.stat(audioPath)
      );

      if (fileStats.size === 0) {
        throw new AppError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Failed to download audio"
        );
      }

      return audioPath;
    } catch (error) {
      logger.error("Error downloading audio", { error });
      if (error instanceof Error) {
        if (error.message.includes("ffmpeg")) {
          throw new AppError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            "Failed to download audio"
          );
        }
        if (error.message.includes("Private Video")) {
          throw new AppError(StatusCodes.FORBIDDEN, "This video is private");
        }
        if (error.message.includes("not available")) {
          throw new AppError(StatusCodes.NOT_FOUND, "Video not found");
        }
        throw new AppError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Failed to download audio"
        );
      }
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to download audio"
      );
    }
  }
}
