import { protos, SpeechClient } from "@google-cloud/speech";
import { Storage } from "@google-cloud/storage";
import logger from "../utils/logger";
import { StatusCodes } from "http-status-codes/build/cjs";
import { AppError } from "../utils/error";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { unlink } from "fs/promises";
import ffmpedInstaller from "@ffmpeg-installer/ffmpeg";

ffmpeg.setFfmpegPath(ffmpedInstaller.path);

export interface TranscriptionService {
  text: string;
  confidence: number;
  isMusic?: boolean;
}

export class TranscriptionService {
  private static readonly BUCKET_NAME = "ai-video-summarizer";
  private static readonly speechClient = new SpeechClient();
  private static readonly storage = new Storage();

  static async ensureBucketExists() {
    try {
      // Skip bucket existence check for now due to permission issues
      // The bucket should be created manually or the service account should have proper permissions
      logger.info(`Skipping bucket existence check for ${this.BUCKET_NAME}`);
      return;
    } catch (error) {
      logger.error(`Error checking bucket ${this.BUCKET_NAME}: ${error}`);
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to access bucket"
      );
    }
  }

  static async uploadToGCS(filePath: string): Promise<string> {
    const filename = path.basename(filePath);
    const bucket = this.storage.bucket(this.BUCKET_NAME);

    try {
      logger.info(
        `Attempting to upload ${filename} to bucket ${this.BUCKET_NAME}`
      );

      await bucket.upload(filePath, {
        destination: filename,
        metadata: {
          contentType: "audio/wav",
        },
      });

      const gcsUrl = `gs://${this.BUCKET_NAME}/${filename}`;
      logger.info(`Successfully uploaded to GCS: ${gcsUrl}`);

      return gcsUrl;
    } catch (error) {
      logger.error(`Error uploading ${filename} to GCS: ${error}`);
      if (error instanceof Error) {
        if (
          error.message.includes("does not have storage.objects.create access")
        ) {
          logger.error(
            "Service account lacks storage.objects.create permission"
          );
        } else if (error.message.includes("bucket does not exist")) {
          logger.error(
            `Bucket ${this.BUCKET_NAME} does not exist. Please create it manually.`
          );
        }
      }
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to upload to GCS"
      );
    }
  }

  static async deleteFromGCS(gcsUrl: string): Promise<void> {
    try {
      const fileName = gcsUrl.split("/").pop();
      if (!fileName) {
        logger.warn("No filename found in GCS URL, skipping delete");
        return;
      }

      logger.info(`Attempting to delete ${fileName} from GCS`);
      const file = this.storage.bucket(this.BUCKET_NAME).file(fileName);
      const [exists] = await file.exists();
      logger.info(`File ${fileName} exists in GCS: ${exists}`);

      if (exists) {
        await file.delete();
        logger.info(`Successfully deleted from GCS: ${gcsUrl}`);
      } else {
        logger.info(`File ${fileName} does not exist in GCS, skipping delete`);
      }
    } catch (error) {
      logger.error(`Error deleting from GCS: ${error}`);
      if (error instanceof Error) {
        if (
          error.message.includes("does not have storage.objects.delete access")
        ) {
          logger.error(
            "Service account lacks storage.objects.delete permission"
          );
        }
      }
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to delete from GCS"
      );
    }
  }

  static async convertToWav(inputPath: string): Promise<string> {
    const outputPath = path.join(
      path.dirname(inputPath),
      `${path.basename(inputPath, path.extname(inputPath))}.wav`
    );

    return new Promise((resolve, reject) => {
      // Try with basic filters first
      const attemptConversion = (useFilters: boolean = true) => {
        const command = ffmpeg(inputPath).toFormat("wav");

        if (useFilters) {
          command.audioFilters([
            "highpass=f=200",
            "lowpass=f=3000",
            "aformat=channel_layouts=mono",
          ]);
        }

        command
          .outputOption(["-acodec pcm_s16le", "-ac 1", "-ar 16000"])
          .save(outputPath)
          .on("start", (commandLine) => {
            logger.info(`FFmpeg process started: ${commandLine}`);
          })
          .on("end", () => {
            logger.info(`Audio converted to WAV: ${outputPath}`);
            resolve(outputPath);
          })
          .on("error", (err: Error) => {
            if (useFilters) {
              logger.warn(
                `FFmpeg conversion with filters failed, trying without filters: ${err.message}`
              );
              attemptConversion(false);
            } else {
              logger.error(`Error converting audio to WAV: ${err}`);
              reject(
                new AppError(
                  StatusCodes.INTERNAL_SERVER_ERROR,
                  "Failed to convert audio to WAV"
                )
              );
            }
          });
      };

      attemptConversion();
    });
  }

  static async detectContentType(
    audioPath: string
  ): Promise<"speech" | "music"> {
    const analysisPath = path.join(
      path.dirname(audioPath),
      `${path.basename(audioPath, path.extname(audioPath))}_analysis.wav`
    );
    return new Promise((resolve, reject) => {
      let musicScore = 0;
      let totalSamples = 0;

      ffmpeg(audioPath)
        .toFormat("wav")
        .audioFrequency(16000)
        .audioFilters(["silencedetect=n=-50dB:d=0.5", "volumedetect"])
        .save(analysisPath)
        .on("stderr", (stderrLine: string) => {
          logger.info(`FFmpeg stderr: ${stderrLine}`);
          if (stderrLine.includes("silence_duration")) {
            musicScore -= 1;
          }
          if (stderrLine.includes("max_volume")) {
            const match = stderrLine.match(/max_volume: (\d+\.\d+)/);
            if (match) {
              const maxVolume = parseFloat(match[1]);
              if (maxVolume > -5) musicScore += 1;
            }
          }
          totalSamples += 1;
        })
        .on("end", async () => {
          await unlink(analysisPath).catch(() => {});
          const ratio = totalSamples > 0 ? musicScore / totalSamples : 0;
          logger.info(`Music detection ratio ${ratio}`);
          resolve(ratio > 0.5 ? "music" : "speech");
        })
        .on("error", async (err: Error) => {
          logger.error(`Error detecting content type: ${err}`);
          reject(
            new AppError(
              StatusCodes.INTERNAL_SERVER_ERROR,
              "Failed to detect content type"
            )
          );
        });
    });
  }

  static async transcribe(audioPath: string): Promise<TranscriptionService> {
    let wavePath: string | undefined;
    let gcsUrl: string | undefined;

    try {
      logger.info(`Starting transcription for audio: ${audioPath}`);

      await this.ensureBucketExists();

      // first convert the file to WAV if its not already
      wavePath = await this.convertToWav(audioPath);
      logger.info(`Converted audio to WAV: ${wavePath}`);

      // detect if the content is speech or music
      const contentType = await this.detectContentType(wavePath);
      logger.info(`Detected content type: ${contentType}`);

      if (contentType === "music") {
        await unlink(wavePath).catch(() => {});
        return {
          text: "[MUSIC CONTENT DETECTED]",
          confidence: 1.0,
          isMusic: true,
        };
      }

      // upload the file to GCS
      gcsUrl = await this.uploadToGCS(wavePath);
      logger.info(`Uploaded to GCS: ${gcsUrl}`);

      // configure transcription request
      const request: protos.google.cloud.speech.v1.ILongRunningRecognizeRequest =
        {
          audio: {
            uri: gcsUrl,
          },
          config: {
            encoding:
              protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding
                .LINEAR16,
            sampleRateHertz: 16000,
            languageCode: process.env.SPEECH_TO_TEXT_LANGUAGE || "en_US",
            enableAutomaticPunctuation: true,
            model: "default",
            useEnhanced: true,
            metadata: {
              interactionType: "DICTATION",
              microphoneDistance: "NEARFIELD",
              recordingDeviceType: "SMARTPHONE",
            },

            enableWordTimeOffsets: true,
            enableWordConfidence: true,
            profanityFilter: true,
            adaptation: {
              phraseSetReferences: [],
              customClasses: [],
            },
            audioChannelCount: 1,
            enableSeparateRecognitionPerChannel: false,
            speechContexts: [
              {
                phrases: ["video", "youtube", "subscribe", "like", "comment"],
                boost: 20,
              },
            ],
          },
        };

      logger.info(`Starting Google Cloud Speech-to-Text operation`);
      const [operation] = await this.speechClient.longRunningRecognize(request);
      logger.info(`Waiting for transcription operation to complete`);
      const [response] = await operation.promise();
      logger.info(`Transcription response: ${JSON.stringify(response)}`);

      // cleanup files
      await Promise.all([
        wavePath ? unlink(wavePath).catch(() => {}) : Promise.resolve(),
        gcsUrl ? this.deleteFromGCS(gcsUrl).catch(() => {}) : Promise.resolve(),
      ]);

      if (!response.results || response.results.length === 0) {
        throw new AppError(StatusCodes.BAD_REQUEST, "No transcription results");
      }
      const transcription = response.results
        .map((result) => result.alternatives?.[0]?.transcript || "")
        .join(" ");

      const confidence =
        response.results.reduce(
          (sum, result) => sum + (result.alternatives?.[0]?.confidence || 0),
          0
        ) / response.results.length;

      if (!transcription.trim()) {
        throw new AppError(StatusCodes.BAD_REQUEST, "No transcription results");
      }

      return {
        text: transcription,
        confidence,
        isMusic: false,
      };
    } catch (error) {
      logger.error(`Error transcribing audio: ${error}`);

      // cleanup files on error
      await Promise.all([
        wavePath ? unlink(wavePath).catch(() => {}) : Promise.resolve(),
        gcsUrl ? this.deleteFromGCS(gcsUrl).catch(() => {}) : Promise.resolve(),
      ]);

      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to transcribe audio"
      );
    }
  }
}
