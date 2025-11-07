import { GoogleGenAI, Type } from "@google/genai";
import { User } from "../types";

// Per guidelines, API key must come from process.env.API_KEY.
// The key is assumed to be available in the execution context.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });


/**
 * 学生の進捗サマリーを生成します。
 * @param student 学生ユーザーオブジェクト。
 * @param courseTitle コースのタイトル。
 * @returns サマリー文字列。
 */
export async function generateStudentProgressSummary(student: User, courseTitle: string): Promise<string> {
    const prompt = `学生「${student.name}」のコース「${courseTitle}」における進捗について、簡潔で励みになるサマリーを生成してください。最近の活動に触れ、改善点を1つ提案してください。100ワード未満でお願いします。`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        // Per guidelines, directly access .text property.
        // Fix: Handle potential undefined response.
        return response.text ?? '';
    } catch (error: any) {
        console.error("Gemini APIでのサマリー生成エラー:", error);
        const detail = error.message ? `: ${error.message}` : '';
        throw new Error(`現在サマリーを生成できません。後でもう一度お試しください${detail}`);
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
        const response = await ai.models.generateContent({
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

        // Per guidelines, directly access .text property.
        // Fix: Safely access .text with optional chaining.
        const jsonText = response.text?.trim();
        if (!jsonText) {
            throw new Error("AIからの応答が空です。");
        }
        
        return JSON.parse(jsonText);

    } catch (error: any)
    {
        console.error("Gemini APIでのコース詳細生成エラー:", error);
        if (error instanceof SyntaxError) {
             throw new Error("AIからの応答を解析できませんでした。形式が正しくない可能性があります。");
        }
        const detail = error.message ? `: ${error.message}` : '';
        throw new Error(`AIによるコース生成に失敗しました。後でもう一度お試しください${detail}`);
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
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        // Per guidelines, directly access .text property.
        // Fix: Handle potential undefined response.
        return response.text ?? '';
    } catch (error: any) {
        console.error("Gemini APIでのレッスン案生成エラー:", error);
        const detail = error.message ? `: ${error.message}` : '';
        throw new Error(`現在レッスン案を生成できません。後でもう一度お試しください${detail}`);
    }
}