"use client";

import { useQuery } from "@tanstack/react-query";
import { jsonHttpClient } from "@/shared/lib/http";

// ============================================================================
// Types
// ============================================================================

export interface FinancialMetrics {
  stockCode: string;
  corpName: string;
  roe: number;
  debtRatio: number;
  operatingMargin: number;
  revenueGrowth: number | null;
  netIncomeGrowth: number | null;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  data?: FinancialMetrics;
  error?: string;
}

// ============================================================================
// Fetcher
// ============================================================================

async function fetchFinancialMetrics(stockCode: string): Promise<FinancialMetrics | null> {
  try {
    const result = await jsonHttpClient.get<ApiResponse>(`/api/financial/metrics/${stockCode}`);

    if (!result.success || !result.data) {
      return null;
    }

    return result.data;
  } catch {
    return null;
  }
}

// ============================================================================
// Hook
// ============================================================================

/**
 * 종목별 재무지표 조회 훅 (tanstack-query)
 *
 * - 캐싱: 5분 (staleTime)
 * - 자동 리페치: 비활성화
 */
export function useFinancialMetrics(stockCode: string | undefined) {
  return useQuery({
    queryKey: ["financial-metrics", stockCode],
    queryFn: () => fetchFinancialMetrics(stockCode!),
    enabled: !!stockCode,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
