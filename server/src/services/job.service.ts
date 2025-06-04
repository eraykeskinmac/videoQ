import Bull from "bull";
import { AppDataSource } from "../config/database";
import { Video } from "../entities/video.entity";
import { Transcription } from "../entities/transcription.entity";
import { Analysis } from "../entities/analysis.entity";
import { User } from "../entities/user.entity";
import { VideoService } from "./video.service";
import { TranscriptionService } from "./transcription.service";
import { unlink } from "fs/promises";

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
  static async setupQueueHandlers() {
    this.transcriptionQueue.process(async (job) => {
      const { url, userId } = job.data;
      let audioPath = null;
      let video: Video | null = null;

      try {
        video = await this.videoRepository.findOne({ where: { url } });
        if (!video) {
          video = new Video();
          video.url = url;
          video.status = "processing";
          video.user = { id: userId } as User;
        }

        job.progress(10);

        const videoInfo =
          job.data.videoInfo || (await VideoService.getVideoInfo(url));

        Object.assign(video, {
          title: videoInfo.title,
          description: videoInfo.description,
          duration: videoInfo.duration,
          author: videoInfo.author,
          thumbnail: videoInfo.thumbnail,
        });
        await this.videoRepository.save(video);
        job.progress(20);
        // download audio
        audioPath = await VideoService.downloadAudio(url);
        job.progress(40);

        // transcribe audio
        const transcriptionResult =
          await TranscriptionService.transcribe(audioPath);

        // check for existing transcription and update or create new one
        let transcription = await this.transcriptionRepository.findOne({
          where: {
            video: { id: video.id },
          },
        });
        if (transcription) {
          // update existing transcription
          transcription.text = transcriptionResult.text;
          transcription.confidence = transcriptionResult.confidence;
          transcription.isMusic = transcriptionResult.isMusic || false;
          transcription.audioPath = audioPath;
        } else {
          // create new transcription
          transcription = new Transcription();
          transcription.video = video;
          transcription.text = transcriptionResult.text;
          transcription.confidence = transcriptionResult.confidence;
          transcription.isMusic = transcriptionResult.isMusic || false;
          transcription.audioPath = audioPath;
        }

        await this.transcriptionRepository.save(transcription);

        // clean up audio file
        if (audioPath) {
          await unlink(audioPath).catch(() => {});
        }
        job.progress(70);

        // dont proceed with AI analysis if its a music video
        if (transcription.isMusic) {
          video.status = "completed";
          await this.videoRepository.save(video);
          return {
            videoInfo,
            transcription: transcriptionResult,
            status: "completed",
          };
        }
      } catch (error) {}
    });
  }
}
