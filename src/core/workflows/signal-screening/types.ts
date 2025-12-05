import type { ScreenedStock } from "@/core/services/stock-signal-screening.service";

/**
 * 종목 스크리닝 워크플로우 결과
 */
export interface SignalScreeningWorkflowResult {
  success: boolean;
  /** 전체 종목 수 */
  totalStocks: number;
  /** 최종 선별 종목 수 */
  screenedCount: number;
  /** 선별된 종목 목록 */
  screenedStocks: ScreenedStock[];
  /** 소요 시간 (ms) */
  durationMs: number;
  /** 에러 메시지 (실패 시) */
  error?: string;
}
