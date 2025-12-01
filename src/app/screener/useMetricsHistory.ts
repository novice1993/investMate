import { useQuery } from "@tanstack/react-query";
import { jsonHttpClient } from "@/shared/lib/http";
import type { FinancialMetricRow } from "./useFinancialMetrics";

interface ApiResponse {
  success: boolean;
  data: FinancialMetricRow[];
  error?: string;
}

async function fetchMetricsHistory(corpCode: string): Promise<FinancialMetricRow[]> {
  const result = await jsonHttpClient.get<ApiResponse>(`/api/financial/metrics/history?corpCode=${corpCode}`);

  if (!result.success) {
    throw new Error(result.error || "Unknown error");
  }

  return result.data;
}

export function useMetricsHistory(corpCode: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["metrics-history", corpCode],
    queryFn: () => fetchMetricsHistory(corpCode!),
    enabled: corpCode !== null,
  });

  return {
    history: data ?? [],
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}
