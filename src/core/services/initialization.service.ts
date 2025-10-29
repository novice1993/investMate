import { issueKisToken, revokeKisToken } from "@/core/infrastructure/kis-auth.infra";
import { initializeGeminiClient } from "@/core/infrastructure/llm.infra";
import { initializeSupabaseClient } from "@/core/infrastructure/supabase.infra";
import { getAuthToken, setAuthToken, clearAuthToken } from "@/core/services/kis-auth.service";

/**
 * KIS 인증 토큰을 발급받아 메모리에 저장하는 초기화 함수
 */
export async function initializeKisToken() {
  try {
    const tokenResponse = await issueKisToken();
    if (tokenResponse && tokenResponse.access_token) {
      setAuthToken(tokenResponse.access_token);
    } else {
      throw new Error("Invalid response from KIS token API.");
    }
  } catch (error) {
    console.error("Error during KIS token initialization:", error);
    throw error;
  }
}

/**
 * Gemini AI 인스턴스를 생성하는 초기화 함수
 */
export async function initializeGemini() {
  try {
    initializeGeminiClient();
  } catch (error) {
    console.error("Error during Gemini initialization:", error);
    throw error;
  }
}

/**
 * Supabase 클라이언트를 생성하는 초기화 함수
 */
export async function initializeSupabase() {
  try {
    initializeSupabaseClient();
  } catch (error) {
    console.error("Error during Supabase initialization:", error);
    throw error;
  }
}

/**
 * 애플리케이션 종료 시 실행될 정리 작업을 수행합니다.
 */
export async function cleanupApplication() {
  console.log("Graceful shutdown initiated. Cleaning up resources...");
  const currentToken = getAuthToken();
  if (currentToken) {
    try {
      await revokeKisToken(currentToken);
      console.log("KIS auth token has been successfully revoked from the KIS server.");
    } catch (error) {
      console.error("Error during KIS token revocation:", error);
    }
  }

  // 내부 메모리(클로저 변수)에 저장된 토큰을 정리합니다.
  clearAuthToken();
  console.log("Cleanup finished.");
}
