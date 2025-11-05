import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

// The build system (Vite) will replace `process.env.API_KEY` with the actual secret value.
// We check if the key was provided.
const apiKey = process.env.API_KEY;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
} else {
  // Log a clear warning for the developer if the API key is missing.
  // This prevents the app from crashing and gracefully disables AI features.
  console.warn("Gemini APIキーが設定されていません。AI機能は無効になります。Cloudflareの環境変数に `API_KEY` を設定してください。");
}

export const geminiService = {
  /**
   * Generates a polite message draft using the Gemini API.
   * @param recipientName The name of the recipient.
   * @param senderName The name of the sender.
   * @param intent A brief description of what the message should be about.
   * @returns The generated message as a string, or a fallback message if the API is not available.
   */
  async generateMessageDraft(recipientName: string, senderName: string, intent: string): Promise<string> {
    // If the AI client wasn't initialized, return a user-friendly fallback message.
    if (!ai) {
      return `AIアシスタントは現在利用できません。APIキーが設定されていません。`;
    }

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
      
        // FIX: Per coding guidelines, access the text property directly.
        return response.text;
    } catch (error) {
        console.error("Error generating message draft with Gemini API:", error);
        return "申し訳ありませんが、メッセージの生成中にエラーが発生しました。";
    }
  }
};