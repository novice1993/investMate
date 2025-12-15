/**
 * @fileoverview 종목 스크리닝 워크플로우
 *
 * 프로세스:
 * 1. KOSPI 기업 목록 조회 (시가총액 포함)
 * 2. Supabase에서 최신 재무 지표 조회
 * 3. 밸류에이션 데이터 조회 (PER/PBR)
 * 4. 펀더멘털 + 밸류에이션 필터링
 * 5. 시가총액 기준 Top N 선별
 */

import { appEvents, APP_EVENTS, ScreeningCompletedPayload } from "@/core/events";
import { readKospiCorpMappingJson } from "@/core/infrastructure/financial/dart-stream.infra";
import { getLatestFinancialMetrics } from "@/core/infrastructure/financial/financial-metrics-repository.infra";
import { replaceScreenedStocks } from "@/core/infrastructure/market/screened-stocks-repository.infra";
import { getAllValuationMap } from "@/core/infrastructure/market/stock-valuation-repository.infra";
import { getLatestConfirmedQuarter } from "@/core/services/financial-date.util";
import { SCREENING_CONFIG, screenStocks } from "@/core/services/stock-signal-screening.service";
import type { SignalScreeningWorkflowResult } from "./types";

// ============================================================================
// Public API
// ============================================================================

/**
 * 종목 스크리닝 워크플로우를 실행합니다.
 *
 * @returns 스크리닝 결과
 */
export async function runSignalScreeningWorkflow(): Promise<SignalScreeningWorkflowResult> {
  const startTime = Date.now();

  try {
    console.log("[Stock Screening Workflow] Starting...");

    // 1. 기업 목록 조회 (시가총액 포함)
    const corpMappings = await readKospiCorpMappingJson();
    console.log(`[Stock Screening Workflow] Loaded ${corpMappings.length} companies`);

    // 2. 최신 재무 지표 조회 (Supabase)
    const { year, quarter } = getLatestConfirmedQuarter();
    const financialMetrics = await getLatestFinancialMetrics(year.toString(), quarter);
    console.log(`[Stock Screening Workflow] Fetched ${financialMetrics.length} financial metrics (${year} Q${quarter})`);

    if (financialMetrics.length === 0) {
      return createErrorResult("No financial metrics found", startTime);
    }

    // 3. 밸류에이션 데이터 조회 (PER/PBR)
    const valuationMap = await getAllValuationMap();
    console.log(`[Stock Screening Workflow] Fetched ${valuationMap.size} valuation data`);

    // 4. 스크리닝 (펀더멘털 + 밸류에이션)
    const screenedStocks = screenStocks(corpMappings, financialMetrics, valuationMap, SCREENING_CONFIG);

    // 5. Supabase에 저장 (DELETE → INSERT)
    await replaceScreenedStocks(screenedStocks);

    console.log(`[Stock Screening Workflow] Final result: ${screenedStocks.length} stocks screened and saved`);

    // 6. 스크리닝 완료 이벤트 발행 (서버에서 KIS 구독 갱신 + 클라이언트 알림)
    const stockCodes = screenedStocks.map((s) => s.stockCode);
    const eventPayload: ScreeningCompletedPayload = {
      screenedCount: screenedStocks.length,
      stockCodes,
      completedAt: new Date().toISOString(),
    };
    appEvents.emit(APP_EVENTS.SCREENING_COMPLETED, eventPayload);
    console.log(`[Stock Screening Workflow] Emitted ${APP_EVENTS.SCREENING_COMPLETED} event`);

    return createSuccessResult(corpMappings.length, screenedStocks.length, screenedStocks, startTime);
  } catch (error) {
    console.error("[Stock Screening Workflow] Error:", error);
    return createErrorResult(error instanceof Error ? error.message : "Unknown error", startTime);
  }
}

// ============================================================================
// Re-export Types
// ============================================================================

export type { SignalScreeningWorkflowResult } from "./types";

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * 성공 결과를 생성합니다.
 */
function createSuccessResult(
  totalStocks: number,
  screenedCount: number,
  screenedStocks: import("@/core/services/stock-signal-screening.service").ScreenedStock[],
  startTime: number
): SignalScreeningWorkflowResult {
  return {
    success: true,
    totalStocks,
    screenedCount,
    screenedStocks,
    durationMs: Date.now() - startTime,
  };
}

/**
 * 에러 결과를 생성합니다.
 */
function createErrorResult(error: string, startTime: number): SignalScreeningWorkflowResult {
  return {
    success: false,
    totalStocks: 0,
    screenedCount: 0,
    screenedStocks: [],
    durationMs: Date.now() - startTime,
    error,
  };
}
