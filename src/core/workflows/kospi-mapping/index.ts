/**
 * @fileoverview KOSPI Corp Mapping 동기화 워크플로우
 *
 * DART Corp 데이터를 스트리밍 방식으로 조회하여 JSON 파일로 저장합니다.
 * 메모리 최적화: 114k 기업을 메모리에 올리지 않고 스트리밍 처리 (~70MB 사용)
 *
 * KRX에서 시가총액 데이터를 함께 수집하여 JSON에 포함합니다.
 */

import path from "path";
import { streamDartCorpToJson } from "@/core/infrastructure/financial/dart-stream.infra";
import { getMarketSecurities } from "@/core/infrastructure/market/krx.infra";

export interface KospiMappingSyncResult {
  success: boolean;
  count: number;
  message: string;
}

/**
 * KOSPI corp mapping을 갱신하여 JSON 파일로 저장합니다.
 *
 * Cron: 하루 1회 실행 권장
 *
 * @returns 동기화 결과
 */
export async function syncKospiCorpMapping(): Promise<KospiMappingSyncResult> {
  try {
    console.log("[KOSPI Mapping Sync] Starting...");

    // 1. KRX에서 KOSPI 종목 조회 (시가총액 포함) (~1MB)
    const krxSecurities = await getMarketSecurities("KOSPI");
    console.log(`[KOSPI Mapping Sync] Fetched ${krxSecurities.length} KOSPI stocks from KRX`);

    // KRX API 실패 시 기존 파일 보존 (덮어쓰기 방지)
    if (krxSecurities.length === 0) {
      console.warn("[KOSPI Mapping Sync] ⚠️ KRX returned 0 stocks - skipping file update to preserve existing data");
      return {
        success: false,
        count: 0,
        message: "KRX API returned 0 stocks - preserved existing mapping file",
      };
    }

    // 2. 종목코드 Set 및 시가총액 Map 생성 (~0.1MB)
    const stockCodeSet = new Set<string>();
    const marketCapMap = new Map<string, number>();

    for (const security of krxSecurities) {
      if (security.symbol) {
        stockCodeSet.add(security.symbol);
        marketCapMap.set(security.symbol, security.marketCap || 0);
      }
    }

    // 3. 스트리밍 파싱 + 파일 직접 쓰기 (~70MB 피크)
    const outputPath = path.join(process.cwd(), "data", "kospi_corp_mapping.json");
    const { count } = await streamDartCorpToJson(stockCodeSet, outputPath, marketCapMap);

    console.log(`[KOSPI Mapping Sync] ✓ Saved ${count} mappings (with marketCap) to ${outputPath}`);

    return {
      success: true,
      count,
      message: `${count} corp mappings synced with market cap`,
    };
  } catch (error) {
    console.error("[KOSPI Mapping Sync] Failed:", error);
    return {
      success: false,
      count: 0,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
