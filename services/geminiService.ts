import { GoogleGenAI } from "@google/genai";
import { User } from "../types";
import { getConfig } from "./config";

let geminiInitializationPromise: Promise<GoogleGenAI> | null = null;

export const initializeGemini = (): Promise<GoogleGenAI> => {
    if (geminiInitializationPromise) {
        return geminiInitializationPromise;
    }

    geminiInitializationPromise = (async () => {
        try {
            const config = await getConfig();
            if (!config.apiKey) {
                throw new Error("Gemini APIキーが設定ファイルに見つかりません。");
            }
            const ai = new GoogleGenAI({ apiKey: config.apiKey });
            return ai;
        } catch (e: any) {
            console.error("Gemini AI initialization error:", e);
            // FIX: Reset promise on failure to allow for retry.
            geminiInitializationPromise = null;
            throw new Error(e.message || "Gemini AIの初期化に失敗しました。");
        }
    })();
    return geminiInitializationPromise;
};


/**
 * 学生の進捗サマリーを生成します。
 * @param student 学生ユーザーオブジェクト。
 * @param courseTitle コースのタイトル。
 * @returns サマリー文字列。
 */
export async function generateStudentProgressSummary(student: User, courseTitle: string): Promise<string> {
    const prompt = `学生「${student.name}」のコース「${courseTitle}」における進捗について、簡潔で励みになるサマリーを生成してください。最近の活動に触れ、改善点を1つ提案してください。100ワード未満でお願いします。`;

    try {
        const localAi = await initializeGemini();
        const response = await localAi.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        // FIX: Per guidelines, access text directly. Provide a fallback for an empty string response.
        return response.text || "現時点ではAIサマリーを生成できませんでした。";
    } catch (error) {
        console.error("Gemini APIでのサマリー生成エラー:", error);
        // Rethrow a more user-friendly error
        throw new Error("現在サマリーを生成できません。後でもう一度お試しください。");
    }
}
