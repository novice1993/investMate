import { GoogleGenAI } from "@google/genai";

/**
 * @fileoverview Gemini AI 클라이언트를 위한 인메모리 캐시 인프라입니다.
 * `globalThis`를 사용하여, Next.js 개발 환경의 Hot Reloading 등에서도 상태가 유지되는
 * 안정적인 싱글톤(Singleton) 캐시를 구현합니다.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// 1. globalThis에 캐시 객체의 타입을 선언해줍니다.
declare global {
  var geminiClientCache: GoogleGenAI | null;
}

// 2. 캐시 초기화 (서버가 시작되거나, 코드가 처음 로드될 때 딱 한 번만 실행)
globalThis.geminiClientCache = globalThis.geminiClientCache || null;

/**
 * Gemini AI 클라이언트를 초기화하고 전역 캐시에 저장합니다.
 */
export function initializeGeminiClient(): void {
  if (globalThis.geminiClientCache) {
    console.log("[LLM Infra] Gemini client already initialized.");
    return;
  }

  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }

  try {
    globalThis.geminiClientCache = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    console.log("[LLM Infra] Gemini client initialized successfully.");
  } catch (error) {
    console.error("[LLM Infra] Failed to initialize Gemini client:", error);
    throw error;
  }
}

/**
 * 현재 저장된 Gemini AI 클라이언트를 조회합니다.
 * @returns Gemini 클라이언트 인스턴스
 */
export function getGeminiClient(): GoogleGenAI {
  if (!globalThis.geminiClientCache) {
    throw new Error("Gemini client not initialized. Call initializeGeminiClient first.");
  }
  return globalThis.geminiClientCache;
}

/**
 * Generates text using the configured LLM.
 * @param prompt The full prompt to send to the model.
 * @returns The generated text.
 */
export async function generateLLMResponse(prompt: string): Promise<string> {
  const genAI = getGeminiClient();

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
