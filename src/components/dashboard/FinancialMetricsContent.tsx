"use client";

import { useFinancialMetricsSuspense } from "@/hooks/useFinancialMetricsSuspense";

// ============================================================================
// Types
// ============================================================================

interface FinancialMetricsContentProps {
  stockCode: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * 재무지표 컨텐츠 (Suspense 내부용)
 *
 * - useSuspenseQuery로 데이터 로딩
 * - 반드시 Suspense로 감싸서 사용
 */
export function FinancialMetricsContent({ stockCode }: FinancialMetricsContentProps) {
  const { data: metrics } = useFinancialMetricsSuspense(stockCode);

  return (
    <div className="grid grid-cols-3 gap-2">
      <MetricCard label="ROE" value={`${metrics.roe.toFixed(1)}%`} />
      <MetricCard label="부채비율" value={`${metrics.debtRatio.toFixed(1)}%`} />
      <MetricCard label="영업이익률" value={`${metrics.operatingMargin.toFixed(1)}%`} />
    </div>
  );
}

// ============================================================================
// Sub Components
// ============================================================================

interface MetricCardProps {
  label: string;
  value: string;
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="p-3 bg-light-gray-5 rounded-lg text-center">
      <div className="text-xs text-light-gray-50 mb-1">{label}</div>
      <div className="text-sm font-semibold text-light-gray-90">{value}</div>
    </div>
  );
}
