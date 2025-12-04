/**
 * 주식 밸류에이션 수집 워크플로우 결과
 */
export interface StockValuationWorkflowResult {
  success: boolean;
  totalStocks: number;
  savedCount: number;
  failedCount: number;
  durationMs: number;
  error?: string;
}
