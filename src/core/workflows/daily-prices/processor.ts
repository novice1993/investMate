/**
 * @fileoverview 일봉 데이터 배치 처리
 */

import { replaceDailyPrices } from "@/core/infrastructure/market/daily-prices-repository.infra";
import { getPeriodStockPrice, toStockPriceEntities } from "@/core/infrastructure/market/kis-price.infra";

/**
 * API 호출 간 대기 시간 (ms)
 * KIS 모의투자 Rate Limit: 초당 2건
 * 안정성을 위해 초당 1건으로 설정
 */
const API_DELAY_MS = 1000;

/**
 * 배치 처리 결과
 */
export interface ProcessResult {
  totalProcessed: number;
  totalSaved: number;
  failed: string[];
}

/**
 * 종목들의 일봉 데이터를 순차 수집하여 저장합니다.
 *
 * @param stockCodes 종목코드 배열
 * @returns 처리 결과
 */
export async function processDailyPrices(stockCodes: string[]): Promise<ProcessResult> {
  const failed: string[] = [];
  let totalProcessed = 0;
  let totalSaved = 0;

  const total = stockCodes.length;

  for (let i = 0; i < stockCodes.length; i++) {
    const stockCode = stockCodes[i];
    const progress = `[${i + 1}/${total}]`;

    try {
      // 1. KIS API로 100일치 일봉 조회
      const kisData = await getPeriodStockPrice(stockCode, "D");

      if (!kisData || kisData.length === 0) {
        console.warn(`[Daily Prices Processor] ${progress} ${stockCode}: 데이터 없음`);
        failed.push(stockCode);
        continue;
      }

      // 2. 엔티티 변환
      const prices = toStockPriceEntities(stockCode, kisData);

      // 3. Supabase 저장 (전체 교체)
      const savedCount = await replaceDailyPrices(stockCode, prices);

      totalSaved += savedCount;
      totalProcessed++;

      console.log(`[Daily Prices Processor] ${progress} ✓ ${stockCode}: ${savedCount}일치 저장`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Daily Prices Processor] ${progress} ✗ ${stockCode}: ${message}`);
      failed.push(stockCode);
    }

    // Rate Limit: 마지막이 아니면 대기
    if (i < stockCodes.length - 1) {
      await sleep(API_DELAY_MS);
    }
  }

  return {
    totalProcessed,
    totalSaved,
    failed,
  };
}

/**
 * 대기 함수
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
