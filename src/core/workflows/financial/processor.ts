/**
 * @fileoverview Financial Workflow 배치 처리 및 지표 계산
 */

import { calculateFinancialMetricsFromData, FinancialMetrics } from "@/core/services/financial-analysis.service";
import { fetchFinancialDataWithFallback, QuarterCode } from "@/core/services/financial-query-strategy.service";
import { CompanyInfo } from "./types";

/**
 * 배치 크기 상수
 */
const BATCH_SIZE = 50;

/**
 * 재무 지표 배치 처리 결과
 */
export interface ProcessResult {
  metrics: FinancialMetrics[];
  failed: string[];
}

/**
 * KOSPI 기업들의 재무 지표를 배치로 처리합니다.
 *
 * @param corpCodes 기업 고유번호 배열
 * @param companyMap 기업 정보 매핑 (corpCode → CompanyInfo)
 * @param year 조회 연도
 * @param quarter 분기 코드
 * @returns 계산된 지표 및 실패한 기업 목록
 */
export async function processFinancialMetrics(corpCodes: string[], companyMap: Map<string, CompanyInfo>, year: string, quarter: QuarterCode): Promise<ProcessResult> {
  const allMetrics: FinancialMetrics[] = [];
  const allFailed: string[] = [];

  // 배치 처리
  for (let i = 0; i < corpCodes.length; i += BATCH_SIZE) {
    const batch = corpCodes.slice(i, i + BATCH_SIZE);

    // 데이터 조회 (Query Strategy - Fallback 포함)
    const { current, previous, previousYearQ4, failed } = await fetchFinancialDataWithFallback(batch, year, quarter);

    allFailed.push(...failed);

    // 지표 계산 (Analysis Service)
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
        allMetrics.push(metrics);
      } else {
        allFailed.push(corpCode);
      }
    }
  }

  return {
    metrics: allMetrics,
    failed: allFailed,
  };
}
