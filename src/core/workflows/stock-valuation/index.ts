/**
 * @fileoverview 주식 밸류에이션 (PER/PBR/EPS/BPS) 수집 워크플로우
 *
 * 프로세스:
 * 1. KOSPI 전체 종목 목록 조회
 * 2. KIS API로 현재가 조회 (PER/PBR/EPS/BPS 포함)
 * 3. Supabase에 저장
 */

import { readKospiCorpMappingJson } from "@/core/infrastructure/financial/dart-stream.infra";
import { getCurrentStockPrice } from "@/core/infrastructure/market/kis-price.infra";
import { upsertBulkStockValuation, type StockValuation } from "@/core/infrastructure/market/stock-valuation-repository.infra";
import type { StockValuationWorkflowResult } from "./types";

// ============================================================================
// Constants
// ============================================================================

/**
 * 배치 크기 (KIS API Rate Limit: 초당 2건)
 */
const BATCH_SIZE = 2;

/**
 * 배치 간 지연 시간 (ms) - 1초 대기로 Rate Limit 준수
 */
const BATCH_DELAY_MS = 1000;

/**
 * DB 저장 배치 크기
 */
const DB_BATCH_SIZE = 50;

// ============================================================================
// Public API
// ============================================================================

/**
 * 주식 밸류에이션 수집 워크플로우를 실행합니다.
 */
export async function runStockValuationWorkflow(): Promise<StockValuationWorkflowResult> {
  const startTime = Date.now();

  try {
    console.log("[Stock Valuation Workflow] Starting...");

    // 1. KOSPI 종목 목록 조회
    const corpMappings = await readKospiCorpMappingJson();
    console.log(`[Stock Valuation Workflow] Loaded ${corpMappings.length} companies`);

    // 2. 오늘 날짜
    const today = formatDate(new Date());

    // 3. KIS API로 밸류에이션 데이터 수집 및 저장
    const { savedCount, failedCount } = await fetchAndSaveValuations(corpMappings, today);

    console.log(`[Stock Valuation Workflow] Completed - Saved: ${savedCount}, Failed: ${failedCount}`);

    return {
      success: true,
      totalStocks: corpMappings.length,
      savedCount,
      failedCount,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error("[Stock Valuation Workflow] Error:", error);
    return {
      success: false,
      totalStocks: 0,
      savedCount: 0,
      failedCount: 0,
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// Re-export Types
// ============================================================================

export type { StockValuationWorkflowResult } from "./types";

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * KIS API로 밸류에이션 데이터를 수집하고 DB에 저장합니다.
 */
async function fetchAndSaveValuations(corpMappings: Awaited<ReturnType<typeof readKospiCorpMappingJson>>, date: string): Promise<{ savedCount: number; failedCount: number }> {
  let savedCount = 0;
  let failedCount = 0;
  let pendingValuations: StockValuation[] = [];

  const totalBatches = Math.ceil(corpMappings.length / BATCH_SIZE);

  for (let i = 0; i < corpMappings.length; i += BATCH_SIZE) {
    const batch = corpMappings.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

    if (batchNumber % 50 === 0) {
      console.log(`[Stock Valuation Workflow] Progress: ${batchNumber}/${totalBatches} batches`);
    }

    // KIS API 호출 (병렬)
    const batchPromises = batch.map(async (corp) => {
      try {
        const priceData = await getCurrentStockPrice(corp.stockCode);
        return {
          stockCode: corp.stockCode,
          corpName: corp.corpName,
          date,
          per: parseFloatOrNull(priceData.per),
          pbr: parseFloatOrNull(priceData.pbr),
          eps: parseFloatOrNull(priceData.eps),
          bps: parseFloatOrNull(priceData.bps),
          currentPrice: parseIntOrNull(priceData.stck_prpr),
        };
      } catch (error) {
        console.warn(`[Stock Valuation Workflow] Failed to fetch ${corp.stockCode}`);
        return null;
      }
    });

    const results = await Promise.all(batchPromises);

    // 성공한 결과만 수집
    for (const result of results) {
      if (result) {
        pendingValuations.push(result);
      } else {
        failedCount++;
      }
    }

    // DB 저장 배치 크기 도달 시 저장
    if (pendingValuations.length >= DB_BATCH_SIZE) {
      await upsertBulkStockValuation(pendingValuations);
      savedCount += pendingValuations.length;
      pendingValuations = [];
    }

    // Rate Limit 준수: 마지막 배치가 아니면 대기
    if (i + BATCH_SIZE < corpMappings.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  // 남은 데이터 저장
  if (pendingValuations.length > 0) {
    await upsertBulkStockValuation(pendingValuations);
    savedCount += pendingValuations.length;
  }

  return { savedCount, failedCount };
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷합니다.
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 문자열을 float로 파싱하거나 null 반환
 */
function parseFloatOrNull(value: string | undefined): number | null {
  if (!value || value === "") return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

/**
 * 문자열을 int로 파싱하거나 null 반환
 */
function parseIntOrNull(value: string | undefined): number | null {
  if (!value || value === "") return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}
