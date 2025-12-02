/**
 * @fileoverview 일봉 데이터 수집 워크플로우
 *
 * 프로세스:
 * 1. KOSPI 종목 목록 조회
 * 2. 종목별 100일치 일봉 데이터 수집 (KIS API)
 * 3. Supabase에 저장 (전체 교체 방식)
 */

import { readKospiCorpMappingJson } from "@/core/infrastructure/financial/dart-stream.infra";
import { processDailyPrices } from "./processor";
import type { DailyPricesWorkflowResult } from "./types";

// ============================================================================
// Public API
// ============================================================================

/**
 * 일봉 데이터 수집 워크플로우 실행
 *
 * @returns 워크플로우 실행 결과
 */
export async function runDailyPricesWorkflow(): Promise<DailyPricesWorkflowResult> {
  const startTime = Date.now();

  try {
    console.log("[Workflow Daily Prices] 시작");

    // 1. KOSPI 종목 목록 조회
    const companies = await readKospiCorpMappingJson();
    const stockCodes = companies.map((c) => c.stockCode).filter((code): code is string => !!code);

    console.log(`[Workflow Daily Prices] 대상 종목: ${stockCodes.length}개`);

    // 2. 일봉 데이터 수집 및 저장
    const { totalProcessed, totalSaved, failed } = await processDailyPrices(stockCodes);

    const durationMs = Date.now() - startTime;

    // 3. 결과 생성
    const result: DailyPricesWorkflowResult = {
      success: true,
      totalStocks: stockCodes.length,
      processedCount: totalProcessed,
      failedCount: failed.length,
      failedStocks: failed,
      durationMs,
    };

    console.log(`[Workflow Daily Prices] 완료`, {
      총종목: result.totalStocks,
      성공: result.processedCount,
      실패: result.failedCount,
      소요시간: `${Math.round(durationMs / 1000)}초`,
    });

    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);

    console.error(`[Workflow Daily Prices] 실패: ${message}`);

    return {
      success: false,
      totalStocks: 0,
      processedCount: 0,
      failedCount: 0,
      failedStocks: [],
      durationMs,
    };
  }
}

// ============================================================================
// Re-export Types
// ============================================================================

export type { DailyPricesWorkflowResult } from "./types";
