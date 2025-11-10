/**
 * @fileoverview Financial Workflow 타입 정의
 */

/**
 * 재무 지표 워크플로우 실행 결과
 */
export interface FinancialMetricsWorkflowResult {
  success: boolean;
  totalCompanies: number;
  processedCount: number;
  savedCount: number;
  failedCount: number;
  failedCorpCodes: string[];
  message: string;
}

/**
 * 기업 정보 (매핑용)
 */
export interface CompanyInfo {
  name: string;
  stockCode?: string;
}
