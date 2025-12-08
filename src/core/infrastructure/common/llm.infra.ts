import Groq from "groq-sdk";

/**
 * @fileoverview LLM 클라이언트를 위한 인메모리 캐시 인프라입니다.
 * `globalThis`를 사용하여, Next.js 개발 환경의 Hot Reloading 등에서도 상태가 유지되는
 * 안정적인 싱글톤(Singleton) 캐시를 구현합니다.
 *
 * 현재: Groq (Llama 3.1)
 * - Gemini에서 전환 (Google 무료 티어 RPD 20으로 축소됨)
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// 1. globalThis에 캐시 객체의 타입을 선언해줍니다.
declare global {
  var llmClientCache: Groq | null;
}

// 2. 캐시 초기화 (서버가 시작되거나, 코드가 처음 로드될 때 딱 한 번만 실행)
globalThis.llmClientCache = globalThis.llmClientCache || null;

/**
 * LLM 클라이언트를 초기화하고 전역 캐시에 저장합니다.
 */
export function initializeLLMClient(): void {
  if (globalThis.llmClientCache) {
    console.log("[LLM Infra] LLM client already initialized.");
    return;
  }

  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY environment variable is not set.");
  }

  try {
    globalThis.llmClientCache = new Groq({ apiKey: GROQ_API_KEY });
    console.log("[LLM Infra] LLM client initialized successfully.");
  } catch (error) {
    console.error("[LLM Infra] Failed to initialize LLM client:", error);
    throw error;
  }
}

/**
 * 현재 저장된 LLM 클라이언트를 조회합니다.
 * @returns LLM 클라이언트 인스턴스
 */
export function getLLMClient(): Groq {
  if (!globalThis.llmClientCache) {
    throw new Error("LLM client not initialized. Call initializeLLMClient first.");
  }
  return globalThis.llmClientCache;
}

/**
 * 기본 LLM 모델
 * - llama-3.1-8b-instant: RPD 14,400 (무료 티어 여유로움)
 * - llama-3.3-70b-versatile: RPD 1,000 (고품질, 제한적)
 */
export const DEFAULT_LLM_MODEL = "llama-3.1-8b-instant";

/**
 * LLM을 사용하여 텍스트를 생성합니다.
 */
export async function generateLLMResponse(prompt: string, model: string = DEFAULT_LLM_MODEL): Promise<string> {
  const client = getLLMClient();

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.choices[0]?.message?.content;
    return text || "응답을 생성할 수 없습니다.";
  } catch (error) {
    console.error("[LLM Infra] Error generating text:", error);
    throw new Error("Failed to generate text from LLM.");
  }
}
