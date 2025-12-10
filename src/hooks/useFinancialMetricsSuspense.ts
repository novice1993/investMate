"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
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

async function fetchFinancialMetrics(stockCode: string): Promise<FinancialMetrics> {
  const result = await jsonHttpClient.get<ApiResponse>(`/api/financial/metrics/${stockCode}`);

  if (!result.success || !result.data) {
    throw new Error(result.error || "재무지표 데이터를 불러올 수 없습니다");
  }

  return result.data;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * 종목별 재무지표 조회 훅 (Suspense 버전)
 *
 * - Suspense와 함께 사용
 * - 로딩 중 컴포넌트 suspend
 * - 에러 시 ErrorBoundary로 전파
 */
export function useFinancialMetricsSuspense(stockCode: string) {
  return useSuspenseQuery({
    queryKey: ["financial-metrics", stockCode],
    queryFn: () => fetchFinancialMetrics(stockCode),
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
