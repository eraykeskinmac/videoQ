import Bull from "bull";
import { AppDataSource } from "../config/database";
import { Video } from "../entities/video.entity";
import { Transcription } from "../entities/transcription.entity";
import { Analysis } from "../entities/analysis.entity";
import { User } from "../entities/user.entity";

interface TranscriptionJob {
  url: string;
  videoInfo?: any;
  userId: string;
}

export class JobsService {
  private static transcriptionQueue: Bull.Queue;
  private static readonly videoRepository = AppDataSource.getRepository(Video);
  private static readonly transcriptionRepository =
    AppDataSource.getRepository(Transcription);

  private static readonly analysisRepository =
    AppDataSource.getRepository(Analysis);

  private static readonly userRepository = AppDataSource.getRepository(User);
  static async initialize() {
    this.transcriptionQueue = new Bull<TranscriptionJob>("transcription", {
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: {
          age: 24 * 3600, // 24 hours
          count: 100,
        },
        removeOnFail: {
          age: 24 * 3600, // 24 hours
          count: 100,
        },
      },
    });

    
  }
}
