

import { GoogleGenAI } from "@google/genai";

// Per coding guidelines, initialize with the API key from environment variables directly.
// The SDK will handle errors if the key is missing.
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
    // No need to check for API key here; the try/catch will handle initialization or request errors.
    const prompt = `あなたは、生徒と先生が使う授業予約システムのAIアシスタントです。以下の情報に基づいて、丁寧で自然な日本語のメッセージを作成してください。

    宛先: ${recipientName}様
    差出人: ${senderName}
    伝えたいこと: ${intent}
    
    メッセージ本文のみを生成してください。件名や署名は不要です。`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
      
        return response.text.trim();
    } catch (error) {
        console.error("Error generating message draft with Gemini API:", error);
        // Provide a generic error message. The console will have details for developers.
        if (error instanceof Error && (error.message.includes('API key') || error.message.includes('permission'))) {
          return "AIアシスタントは現在利用できません。APIキーが設定されていないか、無効です。";
        }
        return "申し訳ありませんが、メッセージの生成中にエラーが発生しました。";
    }
  }
};