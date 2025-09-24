import { useState } from "react";
import { Security } from "@/core/entities/security.entity";

interface UseStockDataReturn {
  stocks: Partial<Security>[];
  loading: boolean;
  error: string | null;
  fetchStockData: () => Promise<void>;
  clearStocks: () => void;
}

export function useStockData(): UseStockDataReturn {
  const [stocks, setStocks] = useState<Partial<Security>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStockData = async () => {
    setLoading(true);
    setError(null);
    setStocks([]);

    try {
      const response = await fetch("/api/krx/securities?market=KOSPI");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch data");
      }
      const data = await response.json();
      setStocks(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const clearStocks = () => {
    setStocks([]);
    setError(null);
  };

  return {
    stocks,
    loading,
    error,
    fetchStockData,
    clearStocks,
  };
}
