/**
 * @fileoverview KOSPI 기업 재무 지표 계산 및 저장 워크플로우
 *
 * 프로세스:
 * 1. 재무 데이터 수집 (Query Strategy Service - Fallback 포함)
 * 2. 재무 지표 계산 (Analysis Service)
 * 3. 계산 성공한 데이터를 Supabase에 Upsert
 * 4. 결과 로깅
 */

import { readKospiCorpMappingJson } from "@/core/infrastructure/financial/dart-stream.infra";
import { upsertBulkFinancialMetrics } from "@/core/infrastructure/financial/financial-metrics-repository.infra";
import { FinancialMetrics } from "@/core/services/financial-analysis.service";
import { getLatestAvailableQuarter, QuarterCode } from "@/core/services/financial-query-strategy.service";
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

    // 2. 기업 목록 조회 및 Map 생성
    const companies = await readKospiCorpMappingJson();
    const corpCodes = companies.map((c) => c.corpCode);
    const companyMap = createCompanyMapFromCompanies(companies);

    // 3. 배치 처리 및 지표 계산 (배치마다 DB 저장)
    const { totalProcessed, totalSaved, failed } = await processFinancialMetrics(corpCodes, companyMap, target.year, target.quarter, async (batchMetrics) => {
      // 배치마다 즉시 DB 저장 (메모리 절약)
      await saveBatchToDatabase(batchMetrics);
    });

    console.log(`[Workflow Financial] Processed: ${totalProcessed}, Saved: ${totalSaved}, Failed: ${failed.length}`);
    logCalculationComplete(totalSaved, corpCodes.length);

    // 4. 결과 생성 및 로깅
    const result = createSuccessResult(corpCodes.length, failed, totalSaved);
    logWorkflowComplete(result);

    // 5. 실패한 기업 상세 로깅 (corpName)
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
 * @param companies KOSPI 기업 목록
 * @returns corpCode → CompanyInfo 매핑
 */
function createCompanyMapFromCompanies(companies: Awaited<ReturnType<typeof readKospiCorpMappingJson>>): Map<string, CompanyInfo> {
  return new Map(
    companies.map((c) => [
      c.corpCode,
      {
        name: c.corpName,
        stockCode: c.stockCode,
      },
    ])
  );
}

/**
 * 배치 재무 지표를 데이터베이스에 즉시 저장합니다.
 * 메모리 절약을 위해 배치마다 호출됩니다.
 *
 * @param metrics 저장할 재무 지표 배열 (배치 단위)
 */
async function saveBatchToDatabase(metrics: FinancialMetrics[]): Promise<void> {
  if (metrics.length === 0) {
    return;
  }

  await upsertBulkFinancialMetrics(metrics);
}
