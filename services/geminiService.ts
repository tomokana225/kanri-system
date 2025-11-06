import { GoogleGenAI, Type } from "@google/genai";
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
        return response.text || "現時点ではAIサマリーを生成できませんでした。";
    } catch (error) {
        console.error("Gemini APIでのサマリー生成エラー:", error);
        throw new Error("現在サマリーを生成できません。後でもう一度お試しください。");
    }
}

/**
 * AIを使用してコースの詳細（タイトルと説明）をJSON形式で生成します。
 * @param topic 管理者が入力したコースのトピック。
 * @returns コースのタイトルと説明を含むオブジェクト。
 */
export async function generateCourseDetails(topic: string): Promise<{ title: string; description: string }> {
    const prompt = `あなたは教育コースのプランナーです。以下のトピックに基づいて、魅力的で簡潔なコースのタイトルと、3〜4文程度の説明文を生成してください。
トピック: "${topic}"
`;

    try {
        const localAi = await initializeGemini();
        const response = await localAi.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: {
                            type: Type.STRING,
                            description: "生成されたコースのタイトルです。"
                        },
                        description: {
                            type: Type.STRING,
                            description: "生成されたコースの説明文です。"
                        }
                    },
                    required: ["title", "description"]
                },
            },
        });

        const jsonText = response.text?.trim();
        if (!jsonText) {
            throw new Error("AIからの応答が空です。");
        }
        
        return JSON.parse(jsonText);

    } catch (error)
    {
        console.error("Gemini APIでのコース詳細生成エラー:", error);
        if (error instanceof SyntaxError) {
             throw new Error("AIからの応答を解析できませんでした。形式が正しくない可能性があります。");
        }
        throw new Error("AIによるコース生成に失敗しました。後でもう一度お試しください。");
    }
}

/**
 * AIを使用してコースのレッスン案を生成します。
 * @param courseTitle コースのタイトル。
 * @returns レッスン案の文字列。
 */
export async function generateLessonPlan(courseTitle: string): Promise<string> {
    const prompt = `あなたは経験豊富な教師です。コース「${courseTitle}」の次の授業で使える、創造的で実践的なレッスン案を3つ提案してください。各提案は簡潔に、箇条書きで記述してください。`;

    try {
        const localAi = await initializeGemini();
        const response = await localAi.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text || "現時点ではレッスン案を生成できませんでした。";
    } catch (error) {
        console.error("Gemini APIでのレッスン案生成エラー:", error);
        throw new Error("現在レッスン案を生成できません。後でもう一度お試しください。");
    }
}