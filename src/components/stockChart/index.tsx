"use client";

import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { ChartSkeleton } from "@/components/skeletons";
import { StockChartContent } from "./StockChartContent";

// ============================================================================
// Types
// ============================================================================

interface StockChartCardProps {
  stockCode: string;
  corpName?: string;
  /** 실시간 시세 표시 여부 (default: false) */
  enableRealtime?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * 주가 차트 카드 (Container)
 *
 * - Suspense + ErrorBoundary 패턴 적용
 * - 로딩: ChartSkeleton 애니메이션
 * - 에러: 재시도 버튼 제공
 */
export function StockChartCard({ stockCode, corpName, enableRealtime = false }: StockChartCardProps) {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <div className="h-full flex flex-col">
      {corpName && <h3 className="text-sm font-medium text-light-gray-70 mb-2">{corpName}</h3>}
      <div className="flex-1">
        <ErrorBoundary resetKeys={[stockCode]} onReset={reset} fallbackRender={({ resetErrorBoundary }) => <ChartErrorFallback onRetry={resetErrorBoundary} />}>
          <Suspense fallback={<ChartSkeleton />}>
            <StockChartContent stockCode={stockCode} enableRealtime={enableRealtime} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}

// ============================================================================
// Error Fallback
// ============================================================================

function ChartErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-4 bg-light-gray-5 rounded-lg">
      <svg className="w-8 h-8 text-light-danger-40 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <p className="text-sm text-light-gray-50 mb-3">차트를 불러올 수 없습니다</p>
      <button onClick={onRetry} className="px-3 py-1.5 text-xs font-medium text-light-gray-60 bg-light-gray-0 border border-light-gray-30 rounded-lg hover:bg-light-gray-10 transition-colors">
        다시 시도
      </button>
    </div>
  );
}

// ============================================================================
// Re-exports
// ============================================================================

export { StockPriceChart } from "./StockPriceChart";
export type { CandleData, RealtimeData } from "./StockPriceChart";
export { useDailyPrices } from "./useDailyPrices";
