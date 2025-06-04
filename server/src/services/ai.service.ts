import { GoogleGenerativeAI } from "@google/generative-ai/dist/generative-ai";

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
    model: "gemini-pro",
  });
}
