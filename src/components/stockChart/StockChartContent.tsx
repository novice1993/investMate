"use client";

import { useMemo } from "react";
import { StockPriceChart, type RealtimeData } from "./StockPriceChart";
import { useDailyPricesSuspense } from "./useDailyPricesSuspense";
import { useRealtimePrice } from "./useRealtimePrice";

// ============================================================================
// Types
// ============================================================================

interface StockChartContentProps {
  stockCode: string;
  enableRealtime?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * 주가 차트 컨텐츠 (Suspense 내부용)
 *
 * - useSuspenseQuery로 데이터 로딩
 * - 반드시 Suspense로 감싸서 사용
 */
export function StockChartContent({ stockCode, enableRealtime = false }: StockChartContentProps) {
  const { candleData } = useDailyPricesSuspense(stockCode);
  const { prices } = useRealtimePrice();

  // 현재 종목의 가격만 추출 (다른 종목 업데이트 시 리렌더링 방지)
  const currentPrice = prices.get(stockCode);

  // 실시간 데이터를 RealtimeData 형식으로 변환
  const realtimeData: RealtimeData[] = useMemo(() => {
    if (!enableRealtime || !currentPrice) return [];

    return [
      {
        timestamp: currentPrice.timestamp,
        price: currentPrice.price,
        volume: currentPrice.volume,
      },
    ];
  }, [enableRealtime, currentPrice]);

  return (
    <div className="h-full flex-1">
      <StockPriceChart candleData={candleData} realtimeData={realtimeData} />
    </div>
  );
}
