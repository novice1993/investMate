import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export function initializeGeminiClient() {
  if (genAI) {
    console.log("[LLM Infra] Gemini client already initialized.");
    return; // Already initialized
  }

  if (!GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY environment variable is not set. Gemini client will not be initialized.");
    return;
  }

  try {
    genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    console.log("[LLM Infra] Gemini client initialized successfully.");
  } catch (error) {
    console.error("[LLM Infra] Failed to initialize Gemini client:", error);
    genAI = null; // Ensure state is clean on failure
  }
}

/**
 * Generates text using the configured LLM.
 * @param prompt The full prompt to send to the model.
 * @returns The generated text.
 */
export async function generateLLMResponse(prompt: string): Promise<string> {
  initializeGeminiClient();

  if (!genAI) {
    console.error("Gemini client not initialized. API key might be missing or initialization failed.");
    return "요약 기능이 현재 설정되지 않았습니다. API 키를 확인해주세요.";
  }

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const text = response.text;
    return text || "응답을 생성할 수 없습니다.";
  } catch (error) {
    console.error("[LLM Infra] Error generating text:", error);
    throw new Error("Failed to generate text from LLM.");
  }
}
