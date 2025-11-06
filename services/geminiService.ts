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
    geminiError = `Gemini AIの初期化に失敗しました。エラー: ${e.message}`;
  }
} else {
  geminiError = "Gemini APIキーが設定されていません。AI機能を使用するには、'API_KEY'環境変数を設定してください。";
  console.error(geminiError);
}

/**
 * 学生の進捗サマリーを生成します。
 * @param student 学生ユーザーオブジェクト。
 * @param courseTitle コースのタイトル。
 * @returns サマリー文字列。
 */
export async function generateStudentProgressSummary(student: User, courseTitle: string): Promise<string> {
    if (!ai || geminiError) {
        return Promise.reject(new Error(geminiError || "Gemini AIは利用できません。"));
    }
    
    const prompt = `学生「${student.name}」のコース「${courseTitle}」における進捗について、簡潔で励みになるサマリーを生成してください。最近の活動に触れ、改善点を1つ提案してください。100ワード未満でお願いします。`;

    try {
        // テキスト生成には ai.models.generateContent を使用します
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // 基本的なテキストタスクモデル
            contents: prompt,
        });

        // response.text を使用して生成されたテキストに直接アクセスし、フォールバックも用意します
        return response.text ?? "現時点ではAIサマリーを生成できませんでした。";
    } catch (error) {
        console.error("Gemini APIでのサマリー生成エラー:", error);
        return Promise.reject(new Error("現在サマリーを生成できません。後でもう一度お試しください。"));
    }
}
