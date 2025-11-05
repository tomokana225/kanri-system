import { GoogleGenAI } from "@google/genai";
import { User } from "../types";

// The API key is injected via vite.config.js and is assumed to be available in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a summary for a student's progress.
 * @param student The student user object.
 * @param courseTitle The title of the course.
 * @returns A summary string.
 */
export async function generateStudentProgressSummary(student: User, courseTitle: string): Promise<string> {
    const prompt = `Generate a concise, encouraging progress summary for a student named ${student.name} in the course "${courseTitle}". Mention their recent activity and suggest one area for improvement. Keep it under 100 words.`;

    try {
        // Use ai.models.generateContent for text generation
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // Basic Text Task model
            contents: prompt,
        });

        // Use response.text to directly access the generated text
        return response.text;
    } catch (error) {
        console.error("Error generating summary with Gemini API:", error);
        return "Could not generate a summary at this time. Please try again later.";
    }
}
