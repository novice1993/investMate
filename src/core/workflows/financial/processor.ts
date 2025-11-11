/**
 * @fileoverview Financial Workflow 배치 처리 및 지표 계산
 */

import { calculateFinancialMetricsFromData, FinancialMetrics } from "@/core/services/financial-analysis.service";
import { fetchFinancialDataWithFallback, QuarterCode } from "@/core/services/financial-query-strategy.service";
import { CompanyInfo } from "./types";

/**
 * 배치 크기 상수
 * API 효율성과 메모리 사용량의 균형을 고려하여 50개로 설정
 */
const BATCH_SIZE = 50;

/**
 * 재무 지표 배치 처리 결과
 */
export interface ProcessResult {
  totalProcessed: number;
  totalSaved: number;
  failed: string[];
}

/**
 * KOSPI 기업들의 재무 지표를 배치로 처리합니다.
 * 메모리 절약을 위해 배치마다 콜백을 호출하여 즉시 DB 저장합니다.
 *
 * @param corpCodes 기업 고유번호 배열
 * @param companyMap 기업 정보 매핑 (corpCode → CompanyInfo)
 * @param year 조회 연도
 * @param quarter 분기 코드
 * @param onBatchComplete 각 배치 완료 시 호출될 콜백 (DB 저장용)
 * @returns 전체 통계 (총 처리/저장 건수, 실패 목록)
 */
export async function processFinancialMetrics(
  corpCodes: string[],
  companyMap: Map<string, CompanyInfo>,
  year: string,
  quarter: QuarterCode,
  onBatchComplete: (metrics: FinancialMetrics[]) => Promise<void>
): Promise<ProcessResult> {
  const allFailed: string[] = [];
  let totalProcessed = 0;
  let totalSaved = 0;

  const totalBatches = Math.ceil(corpCodes.length / BATCH_SIZE);

  // 배치 처리
  for (let i = 0; i < corpCodes.length; i += BATCH_SIZE) {
    const batch = corpCodes.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

    console.log(`[Processor] Processing batch ${batchNumber}/${totalBatches} (${batch.length} companies)...`);

    // 데이터 조회 (Query Strategy - Fallback 포함)
    const { current, previous, previousYearQ4, failed } = await fetchFinancialDataWithFallback(batch, year, quarter);

    allFailed.push(...failed);

    // 지표 계산 (Analysis Service)
    const batchMetrics: FinancialMetrics[] = [];
    for (const corpCode of batch) {
      const currentData = current.get(corpCode);
      const previousData = previous.get(corpCode);
      const company = companyMap.get(corpCode);

      if (!currentData || !previousData || !company || !company.stockCode) {
        if (!failed.includes(corpCode)) {
          allFailed.push(corpCode);
        }
        continue;
      }

      const metrics = calculateFinancialMetricsFromData(corpCode, company.name, company.stockCode, currentData, previousData, previousYearQ4?.get(corpCode));

      if (metrics) {
        batchMetrics.push(metrics);
      } else {
        allFailed.push(corpCode);
      }
    }

    totalProcessed += batch.length;

    // 배치 완료 콜백 호출 (DB 즉시 저장)
    if (batchMetrics.length > 0) {
      await onBatchComplete(batchMetrics);
      totalSaved += batchMetrics.length;
      console.log(`[Processor] ✓ Batch ${batchNumber}/${totalBatches}: ${batchMetrics.length} metrics saved to DB`);
    } else {
      console.log(`[Processor] ✓ Batch ${batchNumber}/${totalBatches}: 0 metrics (all failed)`);
    }

    // batchMetrics는 여기서 참조 해제됨 → GC 가능
  }

  return {
    totalProcessed,
    totalSaved,
    failed: allFailed,
  };
}
