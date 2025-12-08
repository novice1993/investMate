import { initializeLLMClient } from "@/core/infrastructure/common/llm.infra";
import { initializeSupabaseClient } from "@/core/infrastructure/common/supabase.infra";
import { getOrRefreshKisToken, getOrRefreshApprovalKey } from "@/core/infrastructure/market/kis-auth.infra";
import { setCache, clearCache } from "@/shared/lib/utils/cache";

const KIS_TOKEN_KEY = "kis-auth-token";
const KIS_APPROVAL_KEY = "kis-approval-key";

/**
 * KIS REST API용 Access Token을 초기화하는 함수
 *
 * DB에서 유효한 토큰을 가져오거나 새로 발급받아 메모리에 캐시합니다.
 */
export async function initializeKisAccessToken() {
  try {
    const token = await getOrRefreshKisToken();
    setCache(KIS_TOKEN_KEY, token);
    console.log("[KIS Access Token Init] 토큰 초기화 완료");
  } catch (error) {
    console.error("[KIS Access Token Init] 초기화 실패:", error);
    throw error;
  }
}

/**
 * KIS WebSocket 인증용 Approval Key를 초기화하는 함수
 *
 * DB에서 유효한 Approval Key를 가져오거나 새로 발급받아 메모리에 캐시합니다.
 */
export async function initializeKisApprovalKey() {
  try {
    const approvalKey = await getOrRefreshApprovalKey();
    setCache(KIS_APPROVAL_KEY, approvalKey);
    console.log("[KIS Approval Key Init] Approval Key 초기화 완료");
  } catch (error) {
    console.error("[KIS Approval Key Init] 초기화 실패:", error);
    throw error;
  }
}

/**
 * LLM 클라이언트를 생성하는 초기화 함수 (현재: Groq)
 */
export async function initializeLLM() {
  try {
    initializeLLMClient();
  } catch (error) {
    console.error("Error during LLM initialization:", error);
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
 *
 * Note: KIS 토큰은 DB에 영속 저장되어 서버 재시작 후 재사용됩니다.
 * 따라서 서버 종료 시 자동 폐기하지 않습니다.
 * 긴급 상황 시 revokeKisToken()을 수동으로 호출하세요.
 */
export async function cleanupApplication() {
  console.log("Graceful shutdown initiated. Cleaning up resources...");

  // 메모리 캐시만 정리 (토큰은 DB에 유지)
  clearCache(KIS_TOKEN_KEY);
  clearCache(KIS_APPROVAL_KEY);

  console.log("Cleanup finished.");
}
