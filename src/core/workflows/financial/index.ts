/**
 * @fileoverview KOSPI 기업 재무 지표 계산 워크플로우
 */

import { calculateKospiFinancialMetrics, FinancialMetrics } from "@/core/services/financial-analysis.service";

export interface FinancialMetricsWorkflowResult {
  success: boolean;
  totalCompanies: number;
  processedCount: number;
  failedCount: number;
  metrics: FinancialMetrics[];
  failedCorpCodes: string[];
  message: string;
}

/**
 * KOSPI 기업 재무 지표 계산 워크플로우 실행
 */
export async function runFinancialMetricsWorkflow(year: string, quarter: "11011" | "11012" | "11013" | "11014"): Promise<FinancialMetricsWorkflowResult> {
  try {
    const result = await calculateKospiFinancialMetrics(year, quarter);

    const totalCompanies = result.success.length + result.failed.length;

    // TODO: DB 저장
    // if (result.success.length > 0) {
    //   await saveFinancialMetricsToDB(result.success);
    // }

    return {
      success: true,
      totalCompanies,
      processedCount: result.success.length,
      failedCount: result.failed.length,
      metrics: result.success,
      failedCorpCodes: result.failed,
      message: `${result.success.length}/${totalCompanies} companies processed`,
    };
  } catch (error) {
    return {
      success: false,
      totalCompanies: 0,
      processedCount: 0,
      failedCount: 0,
      metrics: [],
      failedCorpCodes: [],
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
