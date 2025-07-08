import {
  GenerateContentRequest,
  GoogleGenerativeAI,
} from "@google/generative-ai";
import { AppError } from "../utils/error";
import { StatusCodes } from "http-status-codes";

export interface AIAnalysis {
  summary: string;
  keyPoints: string[];
  sentiment: "positive" | "negative" | "neutral";
  topics: string[];
  suggestedTags: string[];
}

export class AIService {
  private static readonly genAI = new GoogleGenerativeAI(
    process.env.GOOGLE_API_KEY!
  );
  private static readonly model = AIService.genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
  });

  private static generatePrompt(
    transcription: string,
    videoInfo?: any
  ): string {
    let prompt = `You are a video content analyzer. Your task is to analyze the provided video transcription and return a JSON response.

IMPORTANT: Your response must be valid JSON and match this exact structure:
{
  "summary": "2-3 sentences summarizing the main content",
  "keyPoints": ["point 1", "point 2", "etc"],
  "sentiment": "positive|negative|neutral",
  "topics": ["topic1", "topic2", "etc"],
  "suggestedTags": ["#tag1", "#tag2", "etc"]
}

DO NOT include any text outside the JSON structure. Your response should be parseable by JSON.parse().

Analyze this transcription:
"""
${transcription}
"""`;

    if (videoInfo) {
      prompt += `\n\nAdditional video context:
Title: "${videoInfo.title}"
Author: "${videoInfo.author}"
Duration: ${videoInfo.duration} seconds`;
    }

    return prompt;
  }

  static async analyzeTranscription(
    transcription: string,
    videoInfo?: any
  ): Promise<AIAnalysis> {
    const prompt = AIService.generatePrompt(transcription, videoInfo);
    const generateConfig: GenerateContentRequest = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    };

    const result = await this.model.generateContent(generateConfig);
    const response = result.response;
    const text = response.text();

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text;

      const analysis = JSON.parse(jsonStr) as AIAnalysis;

      // validate the required fields are present
      if (
        !analysis.summary ||
        !Array.isArray(analysis.keyPoints) ||
        !analysis.sentiment
      ) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Invalid response Format");
      }

      // ensure sentiment is one of the allowed values
      if (!["positive", "negative", "neutral"].includes(analysis.sentiment)) {
        analysis.sentiment = "neutral";
      }

      return {
        summary: analysis.summary,
        keyPoints: analysis.keyPoints || [],
        sentiment: analysis.sentiment as "positive" | "negative" | "neutral",
        topics: analysis.topics || [],
        suggestedTags: analysis.suggestedTags || [],
      };
    } catch (error) {
      throw new AppError(StatusCodes.BAD_REQUEST, "AI analysis failed");
    }
  }
}
