/**
 * 일봉 데이터 수집 워크플로우 결과 타입
 */
export interface DailyPricesWorkflowResult {
  success: boolean;
  totalStocks: number;
  processedCount: number;
  failedCount: number;
  failedStocks: string[];
  durationMs: number;
}
