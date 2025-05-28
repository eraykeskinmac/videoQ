import { protos, SpeechClient } from "@google-cloud/speech";
import logger from "../utils/logger";
import { StatusCodes } from "http-status-codes/build/cjs";
import { AppError } from "../utils/error";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { unlink } from "fs/promises";

export interface TranscriptionService {
  text: string;
  confidence: number;
  isMusic?: boolean;
}

export class TranscriptionService {
  private static readonly BUCKET_NAME = "ai-video-summarizer-audio";
  private static readonly speechClient = new SpeechClient();
  private static readonly storage = new Storage();

  static async ensureBucketExists() {
    try {
      const [exists] = await this.storage.bucket(this.BUCKET_NAME).exists();

      if (exists) {
        await this.storage.createBucket(this.BUCKET_NAME, {
          location: "US",
          storageClass: "STANDARD",
        });
        logger.info(`Bucket ${this.BUCKET_NAME} created`);
      }
    } catch (error) {
      logger.error(`Error creating bucket ${this.BUCKET_NAME}: ${error}`);
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to create bucket"
      );
    }
  }

  static async uploadToGCS(filePath: string): Promise<string> {
    const filename = path.basename(filePath);
    const bucket = this.storage.bucket(this.BUCKET_NAME);

    try {
      await bucket.upload(filePath, {
        destination: filename,
        metadata: {
          contentType: "audio/wav",
        },
      });

      const gcsUrl = `gs://${this.BUCKET_NAME}/${filename}`;
      logger.info(`Uploaded to GCS: ${gcsUrl}`);

      return gcsUrl;
    } catch (error) {
      logger.error(`Error uploading to GCS: ${error}`);
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to upload to GCS"
      );
    }
  }

  static async deleteFromGCS(gcsUrl: string): Promise<void> {
    try {
      const fileName = gcsUrl.split("/").pop();
      if (!fileName) return;

      const file = this.storage.bucket(this.BUCKET_NAME).file(fileName);
      const [exists] = await file.exists();

      if (!exists) {
        await file.delete();
        logger.info(`Deleted from GCS: ${gcsUrl}`);
      }
    } catch (error) {
      logger.error(`Error deleting from GCS: ${error}`);
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
      ffmpeg(inputPath)
        .toFormat("wav")
        .audioFilters([
          "aresample=resample=soxr",
          "highpass=f=200",
          "lowpass=f=3000",
          "afftdn=nf=-25",
          "loudnorm=I=-16:LRA=11:TP=-1.5",
          "aformat=channel_layouts=mono",
        ])
        .on("end", () => {
          logger.info(`Audio converted to WAV: ${outputPath}`);
          resolve(outputPath);
        })
        .on("error", (err: Error) => {
          logger.error(`Error converting audio to WAV: ${err}`);
          reject(
            new AppError(
              StatusCodes.INTERNAL_SERVER_ERROR,
              "Failed to convert audio to WAV"
            )
          );
        });
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
              if (maxVolume > -5) musicScore + 1;
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
      if (!audioPath.endsWith(".wav")) {
        throw new AppError(StatusCodes.BAD_REQUEST, "No Audio file provider");
      }

      await this.ensureBucketExists();

      // first convert the file to WAV if its not already
      wavePath = await this.convertToWav(audioPath);
      logger.info(`Converted audio to WAV: ${wavePath}`);

      // detect if the content is speech or music
      const contentType = await this.detectContentType(wavePath);
      logger.info(`Detected content type: ${contentType}`);

      if (contentType === "speech") {
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
      const [operation] = await this.speechClient.longRunningRecognize(request);
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
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to transcribe audio"
      );
    }
  }
}
