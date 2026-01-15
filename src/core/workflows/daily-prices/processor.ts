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
 * 배치 처리 단위 (종목 수)
 * 100개씩 처리 후 메모리 정리 시간 확보
 */
const BATCH_SIZE = 100;

/**
 * 배치 간 대기 시간 (ms)
 * 메모리 해제 및 서버 안정성 확보
 */
const BATCH_DELAY_MS = 10000; // 10초

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
  const totalBatches = Math.ceil(total / BATCH_SIZE);

  console.log(`[Daily Prices Processor] 배치 처리 시작: ${total}개 종목을 ${totalBatches}개 배치로 분할`);

  for (let i = 0; i < stockCodes.length; i++) {
    const stockCode = stockCodes[i];
    const progress = `[${i + 1}/${total}]`;
    const currentBatch = Math.floor(i / BATCH_SIZE) + 1;

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

    // Rate Limit: 종목 간 대기
    if (i < stockCodes.length - 1) {
      await sleep(API_DELAY_MS);
    }

    // 배치 완료 시 메모리 정리 대기
    if ((i + 1) % BATCH_SIZE === 0 && i < stockCodes.length - 1) {
      console.log(`[Daily Prices Processor] 배치 ${currentBatch}/${totalBatches} 완료 (${i + 1}/${total}). ${BATCH_DELAY_MS / 1000}초 대기 중...`);
      await sleep(BATCH_DELAY_MS);
      console.log(`[Daily Prices Processor] 배치 ${currentBatch + 1}/${totalBatches} 시작`);
    }
  }

  console.log(`[Daily Prices Processor] 전체 배치 처리 완료: 성공 ${totalProcessed}개, 실패 ${failed.length}개`);

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
