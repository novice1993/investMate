/**
 * @fileoverview Financial Workflow 결과 처리 및 로깅
 */

import { FinancialMetrics } from "@/core/services/financial-analysis.service";
import { FinancialMetricsWorkflowResult } from "./types";

/**
 * 성공 결과를 생성합니다.
 *
 * @param metrics 계산된 재무 지표 배열
 * @param failed 실패한 기업 코드 배열
 * @param savedCount DB에 저장된 건수
 * @returns 워크플로우 실행 결과
 */
export function createSuccessResult(metrics: FinancialMetrics[], failed: string[], savedCount: number): FinancialMetricsWorkflowResult {
  const totalCompanies = metrics.length + failed.length;

  return {
    success: true,
    totalCompanies,
    processedCount: metrics.length,
    savedCount,
    failedCount: failed.length,
    failedCorpCodes: failed,
    message: `${savedCount}/${totalCompanies} companies saved to DB`,
  };
}

/**
 * 에러 결과를 생성합니다.
 *
 * @param error 발생한 에러
 * @returns 워크플로우 실패 결과
 */
export function createErrorResult(error: unknown): FinancialMetricsWorkflowResult {
  return {
    success: false,
    totalCompanies: 0,
    processedCount: 0,
    savedCount: 0,
    failedCount: 0,
    failedCorpCodes: [],
    message: error instanceof Error ? error.message : "Unknown error",
  };
}

/**
 * 워크플로우 시작 로그를 출력합니다.
 *
 * @param year 조회 연도
 * @param quarter 분기 코드
 */
export function logWorkflowStart(year: string, quarter: string): void {
  console.log(`[Workflow Financial] Starting for ${year} Q${quarter}`);
}

/**
 * 지표 계산 완료 로그를 출력합니다.
 *
 * @param successCount 성공한 기업 수
 * @param total 전체 기업 수
 */
export function logCalculationComplete(successCount: number, total: number): void {
  console.log(`[Workflow Financial] Calculated: ${successCount}/${total} companies`);
}

/**
 * 워크플로우 완료 로그를 출력합니다.
 *
 * @param result 워크플로우 실행 결과
 */
export function logWorkflowComplete(result: FinancialMetricsWorkflowResult): void {
  console.log(`[Workflow Financial] Completed:`, {
    saved: result.savedCount,
    failed: result.failedCount,
  });
}

/**
 * 워크플로우 에러 로그를 출력합니다.
 *
 * @param error 발생한 에러
 */
export function logWorkflowError(error: unknown): void {
  console.error(`[Workflow Financial] Failed:`, error);
}
