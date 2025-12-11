"use client";

import { useState, useEffect, useMemo } from "react";

// ============================================================================
// Types
// ============================================================================

export interface KospiStock {
  corpCode: string;
  corpName: string;
  stockCode: string;
  market: string;
  marketCap: number;
}

interface UseKospiStocksReturn {
  stocks: KospiStock[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => KospiStock[];
}

// ============================================================================
// Hook
// ============================================================================

export function useKospiStocks(): UseKospiStocksReturn {
  const [stocks, setStocks] = useState<KospiStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStocks() {
      try {
        const response = await fetch("/api/kospi-stocks");
        if (!response.ok) {
          throw new Error("종목 데이터를 불러오는데 실패했습니다");
        }
        const data = await response.json();
        setStocks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
      } finally {
        setIsLoading(false);
      }
    }

    loadStocks();
  }, []);

  // 검색 함수 (종목명, 종목코드로 검색)
  const search = useMemo(() => {
    return (query: string): KospiStock[] => {
      if (!query.trim()) return [];

      const normalizedQuery = query.trim().toLowerCase();

      // 종목코드 완전 일치 우선
      const exactCodeMatch = stocks.filter((s) => s.stockCode === normalizedQuery);
      if (exactCodeMatch.length > 0) return exactCodeMatch;

      // 종목명/코드 부분 일치
      const matches = stocks.filter((s) => s.corpName.toLowerCase().includes(normalizedQuery) || s.stockCode.includes(normalizedQuery));

      // 시가총액 순으로 정렬 (상위 종목 우선)
      return matches.sort((a, b) => b.marketCap - a.marketCap).slice(0, 10);
    };
  }, [stocks]);

  return { stocks, isLoading, error, search };
}
