import { useQuery } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { jsonHttpClient } from "@/shared/lib/http";

export interface FinancialMetricRow {
  corp_code: string;
  stock_code: string;
  corp_name: string;
  year: string;
  quarter: number;
  roe: number;
  debt_ratio: number;
  operating_margin: number;
  net_margin: number;
  revenue_yoy: number;
  operating_profit_yoy: number;
  net_income_yoy: number;
}

export interface SearchParams {
  roeMin?: number;
  roeMax?: number;
  debtRatioMax?: number;
  limit?: number;
}

interface ApiResponse {
  success: boolean;
  data: FinancialMetricRow[];
  error?: string;
}

async function fetchFinancialMetrics(params: SearchParams): Promise<FinancialMetricRow[]> {
  const queryParams = new URLSearchParams();

  if (params.roeMin !== undefined) queryParams.set("roeMin", params.roeMin.toString());
  if (params.roeMax !== undefined) queryParams.set("roeMax", params.roeMax.toString());
  if (params.debtRatioMax !== undefined) queryParams.set("debtRatioMax", params.debtRatioMax.toString());
  if (params.limit !== undefined) queryParams.set("limit", params.limit.toString());

  const result = await jsonHttpClient.get<ApiResponse>(`/api/financial/metrics?${queryParams.toString()}`);

  if (!result.success) {
    throw new Error(result.error || "Unknown error");
  }

  return result.data;
}

export function useFinancialMetrics() {
  const [params, setParams] = useState<SearchParams | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["financial-metrics", params],
    queryFn: () => fetchFinancialMetrics(params!),
    enabled: params !== null,
  });

  const search = useCallback((newParams: SearchParams = {}) => {
    setParams(newParams);
  }, []);

  const clearSearch = useCallback(() => {
    setParams(null);
  }, []);

  return {
    metrics: data ?? [],
    isLoading,
    error: error instanceof Error ? error.message : null,
    search,
    clearSearch,
  };
}
