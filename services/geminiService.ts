
import { GoogleGenAI } from "@google/genai";

// Per coding guidelines, the API key must be sourced from `process.env.API_KEY`.
// The build system will replace this with the secret value at build time.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  /**
   * Generates a polite message draft using the Gemini API.
   * @param recipientName The name of the recipient.
   * @param senderName The name of the sender.
   * @param intent A brief description of what the message should be about.
   * @returns The generated message as a string.
   */
  async generateMessageDraft(recipientName: string, senderName: string, intent: string): Promise<string> {
    const prompt = `あなたは、生徒と先生が使う授業予約システムのAIアシスタントです。以下の情報に基づいて、丁寧で自然な日本語のメッセージを作成してください。

    宛先: ${recipientName}様
    差出人: ${senderName}
    伝えたいこと: ${intent}
    
    メッセージ本文のみを生成してください。件名や署名は不要です。`;

    try {
        if (!process.env.API_KEY) {
           throw new Error("API key is not configured.");
        }
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
      
        return response.text.trim();
    } catch (error) {
        console.error("Error generating message draft with Gemini API:", error);
        if (error instanceof Error && (error.message.includes('API key') || error.message.includes('configured'))) {
          return `AIアシスタントは現在利用できません。環境変数 'API_KEY' が設定されていないか、無効です。`;
        }
        return "申し訳ありませんが、メッセージの生成中にエラーが発生しました。";
    }
  }
};