import { GoogleGenAI } from "@google/genai";
import { User } from "../types";

const apiKey = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
export let geminiError: string | null = null;

if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (e: any) {
    console.error("Gemini AI initialization error:", e);
    geminiError = `Failed to initialize Gemini AI. Error: ${e.message}`;
  }
} else {
  geminiError = "Gemini API key is not configured. Please set the 'API_KEY' environment variable to use AI features.";
  console.error(geminiError);
}

/**
 * Generates a summary for a student's progress.
 * @param student The student user object.
 * @param courseTitle The title of the course.
 * @returns A summary string.
 */
export async function generateStudentProgressSummary(student: User, courseTitle: string): Promise<string> {
    if (!ai || geminiError) {
        return Promise.reject(new Error(geminiError || "Gemini AI is not available."));
    }
    
    const prompt = `Generate a concise, encouraging progress summary for a student named ${student.name} in the course "${courseTitle}". Mention their recent activity and suggest one area for improvement. Keep it under 100 words.`;

    try {
        // Use ai.models.generateContent for text generation
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // Basic Text Task model
            contents: prompt,
        });

        // Use response.text to directly access the generated text, with a fallback
        return response.text ?? "AI summary could not be generated at this time.";
    } catch (error) {
        console.error("Error generating summary with Gemini API:", error);
        return Promise.reject(new Error("Could not generate a summary at this time. Please try again later."));
    }
}