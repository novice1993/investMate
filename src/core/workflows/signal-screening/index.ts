/**
 * @fileoverview 시그널 스크리닝 워크플로우
 *
 * 프로세스:
 * 1. Supabase에서 최신 재무 지표 조회
 * 2. 펀더멘털 필터링 (ROE, 부채비율, 영업이익률)
 * 3. 일봉 데이터 조회 (KIS API)
 * 4. 기술적 지표 필터링 (RSI, 골든크로스, 거래량)
 * 5. 시가총액 기준 Top N 선별
 */

import { readKospiCorpMappingJson } from "@/core/infrastructure/financial/dart-stream.infra";
import { getLatestFinancialMetrics } from "@/core/infrastructure/financial/financial-metrics-repository.infra";
import { getPeriodStockPrice, toStockPriceEntities } from "@/core/infrastructure/market/kis-price.infra";
import { getAllValuationMap } from "@/core/infrastructure/market/stock-valuation-repository.infra";
import { getLatestConfirmedQuarter } from "@/core/services/financial-date.util";
import { SCREENING_CONFIG } from "@/core/services/stock-signal-screening.config";
import { preScreenByFundamentals, screenStocks } from "@/core/services/stock-signal-screening.service";
import type { SignalScreeningWorkflowResult } from "./types";

// ============================================================================
// Constants
// ============================================================================

/**
 * 일봉 조회 배치 크기 (KIS API Rate Limit 고려)
 */
const PRICE_BATCH_SIZE = 3;

/**
 * 배치 간 지연 시간 (ms)
 */
const BATCH_DELAY_MS = 2000;

// ============================================================================
// Public API
// ============================================================================

/**
 * 시그널 스크리닝 워크플로우를 실행합니다.
 *
 * @returns 스크리닝 결과
 */
export async function runSignalScreeningWorkflow(): Promise<SignalScreeningWorkflowResult> {
  const startTime = Date.now();

  try {
    console.log("[Signal Screening Workflow] Starting...");

    // 1. 기업 목록 조회 (시가총액 포함)
    const corpMappings = await readKospiCorpMappingJson();
    console.log(`[Signal Screening Workflow] Loaded ${corpMappings.length} companies`);

    // 2. 최신 재무 지표 조회 (Supabase)
    const { year, quarter } = getLatestConfirmedQuarter();
    const financialMetrics = await getLatestFinancialMetrics(year.toString(), quarter);
    console.log(`[Signal Screening Workflow] Fetched ${financialMetrics.length} financial metrics (${year} Q${quarter})`);

    if (financialMetrics.length === 0) {
      return createErrorResult("No financial metrics found", startTime);
    }

    // 3. 밸류에이션 데이터 조회 (PER/PBR)
    const valuationMap = await getAllValuationMap();
    console.log(`[Signal Screening Workflow] Fetched ${valuationMap.size} valuation data`);

    // 4. 펀더멘털 1차 필터링 (일봉 조회 전 후보군 축소)
    const candidateStockCodes = preScreenByFundamentals(corpMappings, financialMetrics, valuationMap, SCREENING_CONFIG);
    console.log(`[Signal Screening Workflow] Fundamental pre-screen: ${candidateStockCodes.length} candidates`);

    if (candidateStockCodes.length === 0) {
      return createSuccessResult(corpMappings.length, 0, 0, [], startTime);
    }

    // 5. 일봉 데이터 조회 (KIS API - Rate Limit 고려)
    const priceDataMap = await fetchPriceDataBatch(candidateStockCodes);
    console.log(`[Signal Screening Workflow] Fetched price data for ${priceDataMap.size} stocks`);

    // 6. 최종 스크리닝 (펀더멘털 + 기술적 지표)
    const screenedStocks = screenStocks(corpMappings, financialMetrics, priceDataMap, valuationMap, SCREENING_CONFIG);

    console.log(`[Signal Screening Workflow] Final result: ${screenedStocks.length} stocks screened`);

    return createSuccessResult(corpMappings.length, candidateStockCodes.length, screenedStocks.length, screenedStocks, startTime);
  } catch (error) {
    console.error("[Signal Screening Workflow] Error:", error);
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
 * 여러 종목의 일봉 데이터를 배치로 조회합니다.
 * KIS API Rate Limit (초당 2건)을 고려하여 배치 처리합니다.
 *
 * @param stockCodes 종목 코드 배열
 * @returns 종목코드 → 일봉 데이터 Map
 */
async function fetchPriceDataBatch(stockCodes: string[]): Promise<Map<string, import("@/core/entities/stock-price.entity").StockPrice[]>> {
  const priceDataMap = new Map<string, import("@/core/entities/stock-price.entity").StockPrice[]>();

  for (let i = 0; i < stockCodes.length; i += PRICE_BATCH_SIZE) {
    const batch = stockCodes.slice(i, i + PRICE_BATCH_SIZE);
    const batchNumber = Math.floor(i / PRICE_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(stockCodes.length / PRICE_BATCH_SIZE);

    console.log(`[Signal Screening Workflow] Fetching price batch ${batchNumber}/${totalBatches}...`);

    const batchPromises = batch.map(async (stockCode) => {
      try {
        const priceOutputs = await getPeriodStockPrice(stockCode, "D");
        const prices = toStockPriceEntities(stockCode, priceOutputs);
        return { stockCode, prices };
      } catch (error) {
        console.warn(`[Signal Screening Workflow] Failed to fetch price for ${stockCode}:`, error);
        return { stockCode, prices: [] };
      }
    });

    const results = await Promise.all(batchPromises);

    for (const { stockCode, prices } of results) {
      if (prices.length > 0) {
        priceDataMap.set(stockCode, prices);
      }
    }

    // Rate Limit 준수: 마지막 배치가 아니면 대기
    if (i + PRICE_BATCH_SIZE < stockCodes.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return priceDataMap;
}

/**
 * 성공 결과를 생성합니다.
 */
function createSuccessResult(
  totalStocks: number,
  fundamentalPassedCount: number,
  screenedCount: number,
  screenedStocks: import("@/core/services/stock-signal-screening.service").ScreenedStock[],
  startTime: number
): SignalScreeningWorkflowResult {
  return {
    success: true,
    totalStocks,
    fundamentalPassedCount,
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
    fundamentalPassedCount: 0,
    screenedCount: 0,
    screenedStocks: [],
    durationMs: Date.now() - startTime,
    error,
  };
}
