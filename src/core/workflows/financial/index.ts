/**
 * @fileoverview KOSPI 기업 재무 지표 계산 및 저장 워크플로우
 *
 * 프로세스:
 * 1. 재무 데이터 수집 (Query Strategy Service - Fallback 포함)
 * 2. 재무 지표 계산 (Analysis Service)
 * 3. 계산 성공한 데이터를 Supabase에 Upsert
 * 4. 결과 로깅
 */

import { upsertBulkFinancialMetrics } from "@/core/infrastructure/financial/financial-metrics-repository.infra";
import { FinancialMetrics } from "@/core/services/financial-analysis.service";
import { getLatestAvailableQuarter, QuarterCode } from "@/core/services/financial-query-strategy.service";
import { getKospiListedCompanies } from "@/core/services/listed-company.service";
import { processFinancialMetrics } from "./processor";
import { createErrorResult, createSuccessResult, logCalculationComplete, logWorkflowComplete, logWorkflowError, logWorkflowStart } from "./result";
import { CompanyInfo, FinancialMetricsWorkflowResult } from "./types";

// ============================================================================
// Public API
// ============================================================================

/**
 * KOSPI 기업 재무 지표 계산 및 저장 워크플로우 실행
 *
 * @param year 조회 연도 (생략 시 최신 분기 자동 결정)
 * @param quarter 분기 코드 (생략 시 최신 분기 자동 결정)
 * @returns 워크플로우 실행 결과
 */
export async function runFinancialMetricsWorkflow(year?: string, quarter?: QuarterCode): Promise<FinancialMetricsWorkflowResult> {
  try {
    // 1. 분기 결정
    const target = year && quarter ? { year, quarter } : getLatestAvailableQuarter();
    logWorkflowStart(target.year, target.quarter);

    // 2. 기업 목록 및 매핑 준비
    const companies = await getKospiListedCompanies();
    const corpCodes = companies.map((c) => c.company.id);
    const companyMap = createCompanyMap(companies);

    // 3. 배치 처리 및 지표 계산
    const { metrics, failed } = await processFinancialMetrics(corpCodes, companyMap, target.year, target.quarter);

    logCalculationComplete(metrics.length, corpCodes.length);

    // 4. DB 저장
    const savedCount = await saveToDatabase(metrics);

    // 5. 결과 생성 및 로깅
    const result = createSuccessResult(metrics, failed, savedCount);
    logWorkflowComplete(result);

    // 6. 실패한 기업 상세 로깅 (corpName)
    if (failed.length > 0) {
      const failedCompanyNames = failed.map((corpCode) => companyMap.get(corpCode)?.name || corpCode);
      console.warn(`[Workflow Financial] Failed companies (${failed.length}):`, failedCompanyNames);
    }

    return result;
  } catch (error) {
    logWorkflowError(error);
    return createErrorResult(error);
  }
}

// ============================================================================
// Re-export Types
// ============================================================================

export type { FinancialMetricsWorkflowResult } from "./types";

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * 기업 정보 매핑을 생성합니다.
 *
 * @param companies 기업 목록
 * @returns corpCode → CompanyInfo 매핑
 */
function createCompanyMap(companies: Awaited<ReturnType<typeof getKospiListedCompanies>>): Map<string, CompanyInfo> {
  return new Map(
    companies.map((c) => [
      c.company.id,
      {
        name: c.company.name,
        stockCode: c.company.stockCode,
      },
    ])
  );
}

/**
 * 재무 지표를 데이터베이스에 저장합니다.
 *
 * @param metrics 저장할 재무 지표 배열
 * @returns 저장된 건수
 */
async function saveToDatabase(metrics: FinancialMetrics[]): Promise<number> {
  if (metrics.length === 0) {
    return 0;
  }

  console.log(`[Workflow Financial] Saving ${metrics.length} records to DB...`);
  await upsertBulkFinancialMetrics(metrics);
  console.log(`[Workflow Financial] ✓ Saved ${metrics.length} records`);

  return metrics.length;
}
