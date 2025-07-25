import Bull from "bull";
import { AppDataSource } from "../config/database";
import { Video } from "../entities/video.entity";
import { Transcription } from "../entities/transcription.entity";
import { Analysis } from "../entities/analysis.entity";
import { User } from "../entities/user.entity";
import { VideoService } from "./video.service";
import { TranscriptionService } from "./transcription.service";
import { unlink } from "fs/promises";
import { AIService } from "./ai.service";
import { AppError } from "../utils/error";
import logger from "../utils/logger";
import { StatusCodes } from "http-status-codes";

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

  static getTranscriptionQueue() {
    return this.transcriptionQueue;
  }

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

        // analyze video
        const analysisResult = await AIService.analyzeTranscription(
          transcriptionResult.text,
          videoInfo
        );

        let analysis = await this.analysisRepository.findOne({
          where: { video: { id: video.id } },
        });

        if (analysis) {
          Object.assign(analysis, analysisResult);
        } else {
          analysis = new Analysis();
          Object.assign(analysis, analysisResult);
          analysis.video = video;
        }
        await this.analysisRepository.save(analysis);

        video.status = "completed";
        await this.videoRepository.save(video);

        job.progress(100);
        return {
          videoInfo,
          transcription: transcriptionResult,
          analysis: analysisResult,
          status: "completed",
        };
      } catch (error) {
        if (audioPath) {
          await unlink(audioPath).catch(() => {});
        }

        if (video) {
          video.status = "failed";
          await this.videoRepository.save(video);
        }

        logger.error("Error processing video:", error);

        if (
          error instanceof AppError &&
          (error.message.includes("No speech detected") ||
            error.message.includes("This video is private") ||
            error.message.includes("This video is no longer available"))
        ) {
          return {
            error: error.message,
            status: "failed",
            final: true,
          };
        }
        throw error;
      }
    });

    this.transcriptionQueue.on("completed", async (job, result) => {
      try {
        const user = await this.userRepository.findOne({
          where: { id: job.data.userId },
        });

        if (user && result.videoInfo) {
          // TODO: send a job completion email
        }
      } catch (error) {
        logger.error("Error sending job completion email:", error);
      }
    });

    this.transcriptionQueue.on("failed", async (job, error) => {
      logger.error(`Job ${job.id} failed: ${error}`);
    });

    this.transcriptionQueue.on("error", async (error) => {
      logger.error("Transcription queue error:", error);
    });

    // clean up stuck jobs
    this.transcriptionQueue.clean(24 * 3600 * 1000, "delayed");
    this.transcriptionQueue.clean(24 * 3600 * 1000, "wait");
    this.transcriptionQueue.clean(24 * 3600 * 1000, "active");
  }

  static async addTranscriptionJob(url: string, videoInfo?: any, user?: any) {
    let video = await this.videoRepository.findOne({ where: { url } });

    if (!video) {
      video = new Video();
      video.url = url;
      video.status = "pending";
      video.user = user;
      if (videoInfo) {
        Object.assign(video, {
          title: videoInfo.title,
          description: videoInfo.description,
          duration: videoInfo.duration,
          author: videoInfo.author,
          thumbnail: videoInfo.thumbnailUrl || videoInfo.thumbnail,
        });
      }
      await this.videoRepository.save(video);
    }

    const job = await this.transcriptionQueue.add({
      url,
      videoInfo,
      userId: video.user.id,
    });

    return { jobId: job.id };
  }

  static async getJobStatus(jobId: string) {
    const job = await this.transcriptionQueue.getJob(jobId);
    if (!job) {
      throw new AppError(StatusCodes.NOT_FOUND, "Job not found");
    }

    const state = await job.getState();
    const progress = await job.progress();
    const result = await job.returnvalue;
    const failedReason = await job.failedReason;
    const attempts = await job.attemptsMade;

    let videoStatus = null;
    if (result?.videoInfo?.url) {
      const video = await this.videoRepository.findOne({
        where: { url: result.videoInfo.url },
        relations: ["transcription", "analysis"],
      });
      if (video) {
        videoStatus = {
          id: video.id,
          status: video.status,
          hasTranscription: !!video.transcription,
          hasAnalysis: !!video.analysis,
        };
      }
    }

    return {
      id: job.id,
      result,
      state,
      progress,
      failedReason,
      attempts,
      videoStatus,
      final: result?.final || state === "completed" || attempts >= 3,
    };
  }

  static async getAllJobs(userId: string) {
    // get jobs in different states
    const activeJobs = await this.transcriptionQueue.getActive();
    const waitingJobs = await this.transcriptionQueue.getWaiting();
    const completedJobs = await this.transcriptionQueue.getCompleted();
    const delayedJobs = await this.transcriptionQueue.getDelayed();
    const failedJobs = await this.transcriptionQueue.getFailed();

    // combine all jobs and sort by createdAt
    const jobs = [
      ...activeJobs,
      ...waitingJobs,
      ...completedJobs,
      ...delayedJobs,
      ...failedJobs,
    ];

    // filter jobs by user ID and sort by timestamp (most recent first)
    const userJobs = jobs.filter((job) => job.data.userId === userId);
    userJobs.sort((a, b) => (b.timestamp = a.timestamp));

    const jobDetails = await Promise.all(
      userJobs.map(async (job) => {
        const state = await job.getState();
        return {
          id: job.id,
          state,
          progress: job.progress(),
          data: job.data,
          timestamp: job.timestamp,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          failedReason: job.failedReason,
          attempts: job.attemptsMade,
          videoStatus: job.data.videoInfo?.url
            ? await this.getVideoStatus(job.data.url)
            : null,
        };
      })
    );

    return jobDetails;
  }

  // helper method to get video status
  private static async getVideoStatus(url: string) {
    const video = await this.videoRepository.findOne({
      where: { url },
      relations: ["transcription", "analysis"],
    });

    if (!video) return null;

    return {
      id: video.id,
      status: video.status,
      hasTranscription: !!video.transcription,
      hasAnalysis: !!video.analysis,
      title: video.title,
      thumbnail: video.thumbnail,
    };
  }
}
