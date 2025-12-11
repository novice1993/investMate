import { useState, useEffect } from "react";

// ============================================================================
// Types
// ============================================================================

export interface ScreenedStock {
  stockCode: string;
  corpCode: string;
  corpName: string;
  marketCap: number;
  roe: number;
  debtRatio: number;
  operatingMargin: number;
}

interface UseScreenedStocksReturn {
  stocks: ScreenedStock[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * 선별된 종목 목록을 가져오는 훅
 */
export function useScreenedStocks(): UseScreenedStocksReturn {
  const [stocks, setStocks] = useState<ScreenedStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStocks = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/screened-stocks");
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "선별 종목을 불러오는데 실패했습니다");
      }

      setStocks(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다");
      setStocks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  return {
    stocks,
    isLoading,
    error,
    refetch: fetchStocks,
  };
}
