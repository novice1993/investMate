"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { jsonHttpClient } from "@/shared/lib/http";
import type { CandleData } from "./StockPriceChart";

// ============================================================================
// Types
// ============================================================================

interface DailyPriceApiResponse {
  success: boolean;
  data: {
    stockCode: string;
    date: string;
    openPrice: number;
    highPrice: number;
    lowPrice: number;
    closePrice: number;
    volume: number;
    change: number;
    changePercent: number;
  }[];
  count: number;
  error?: string;
}

// ============================================================================
// Fetcher
// ============================================================================

async function fetchDailyPrices(stockCode: string): Promise<CandleData[]> {
  const result = await jsonHttpClient.get<DailyPriceApiResponse>(`/api/stocks/${stockCode}/daily-prices`);

  if (!result.success) {
    throw new Error(result.error || "일봉 데이터 조회 실패");
  }

  return result.data.map((item) => ({
    date: item.date,
    open: item.openPrice,
    high: item.highPrice,
    low: item.lowPrice,
    close: item.closePrice,
    volume: item.volume,
  }));
}

// ============================================================================
// Hook
// ============================================================================

/**
 * 일봉 데이터 조회 훅 (Suspense 버전)
 *
 * - Suspense와 함께 사용
 * - 로딩 중 컴포넌트 suspend
 * - 에러 시 ErrorBoundary로 전파
 */
export function useDailyPricesSuspense(stockCode: string) {
  const { data } = useSuspenseQuery({
    queryKey: ["daily-prices", stockCode],
    queryFn: () => fetchDailyPrices(stockCode),
    staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
  });

  return { candleData: data };
}
