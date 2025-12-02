import { useQuery } from "@tanstack/react-query";
import type { CandleData } from "@/components/charts/StockPriceChart";
import { jsonHttpClient } from "@/shared/lib/http";

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

async function fetchDailyPrices(stockCode: string): Promise<CandleData[]> {
  const result = await jsonHttpClient.get<DailyPriceApiResponse>(`/api/stocks/${stockCode}/daily-prices`);

  if (!result.success) {
    throw new Error(result.error || "일봉 데이터 조회 실패");
  }

  // API 응답을 CandleData 형식으로 변환
  return result.data.map((item) => ({
    date: item.date,
    open: item.openPrice,
    high: item.highPrice,
    low: item.lowPrice,
    close: item.closePrice,
  }));
}

export function useDailyPrices(stockCode: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["daily-prices", stockCode],
    queryFn: () => fetchDailyPrices(stockCode!),
    enabled: stockCode !== null,
    staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
  });

  return {
    candleData: data ?? [],
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}
