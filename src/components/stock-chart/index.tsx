"use client";

import { useEffect, useMemo } from "react";
import { StockPriceChart, type RealtimeData } from "./StockPriceChart";
import { useDailyPrices } from "./useDailyPrices";
import { useRealtimePrice } from "./useRealtimePrice";

// ============================================================================
// Types
// ============================================================================

interface StockChartCardProps {
  stockCode: string;
  corpName?: string;
  /** 실시간 시세 구독 여부 (default: false) */
  enableRealtime?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * 주가 차트 카드 (Container)
 *
 * - 일봉 데이터 조회 (useDailyPrices)
 * - 실시간 데이터 구독 (useRealtimePrice) - enableRealtime=true일 때만
 * - StockPriceChart에 데이터 전달
 */
export function StockChartCard({ stockCode, corpName, enableRealtime = false }: StockChartCardProps) {
  const { candleData, isLoading, error } = useDailyPrices(stockCode);
  const { prices, subscribe, isConnected } = useRealtimePrice();

  // 실시간 구독 (enableRealtime일 때만)
  useEffect(() => {
    if (enableRealtime && isConnected && stockCode) {
      subscribe(stockCode);
    }
  }, [enableRealtime, isConnected, stockCode, subscribe]);

  // 실시간 데이터를 RealtimeData 형식으로 변환
  const realtimeData: RealtimeData[] = useMemo(() => {
    if (!enableRealtime) return [];

    const price = prices.get(stockCode);
    if (!price) return [];

    return [
      {
        timestamp: price.timestamp,
        price: price.price,
        volume: price.volume,
      },
    ];
  }, [enableRealtime, prices, stockCode]);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-light-gray-40">로딩 중...</p>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-light-danger-50">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {corpName && <h3 className="text-sm font-medium text-light-gray-70 mb-2">{corpName}</h3>}
      <div className="flex-1">
        <StockPriceChart candleData={candleData} realtimeData={realtimeData} />
      </div>
    </div>
  );
}

// ============================================================================
// Re-exports
// ============================================================================

export { StockPriceChart } from "./StockPriceChart";
export type { CandleData, RealtimeData } from "./StockPriceChart";
