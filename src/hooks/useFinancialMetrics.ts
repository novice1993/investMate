import { useState } from "react";

// Supabase 응답 타입 (스네이크 케이스)
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

interface UseFinancialMetricsParams {
  roeMin?: number;
  roeMax?: number;
  debtRatioMax?: number;
  limit?: number;
}

export function useFinancialMetrics() {
  const [metrics, setMetrics] = useState<FinancialMetricRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async (params: UseFinancialMetricsParams = {}) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();

      if (params.roeMin !== undefined) queryParams.set("roeMin", params.roeMin.toString());
      if (params.roeMax !== undefined) queryParams.set("roeMax", params.roeMax.toString());
      if (params.debtRatioMax !== undefined) queryParams.set("debtRatioMax", params.debtRatioMax.toString());
      if (params.limit !== undefined) queryParams.set("limit", params.limit.toString());

      const response = await fetch(`/api/financial/metrics?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch financial metrics");
      }

      const result = await response.json();

      if (result.success) {
        setMetrics(result.data);
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch metrics");
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  const clearMetrics = () => {
    setMetrics([]);
    setError(null);
  };

  return {
    metrics,
    loading,
    error,
    fetchMetrics,
    clearMetrics,
  };
}
