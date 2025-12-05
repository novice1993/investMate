"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useFinancialMetrics, type FinancialMetricRow } from "@/app/screener/useFinancialMetrics";
import { useMetricsHistory } from "@/app/screener/useMetricsHistory";
import { FinancialMetricsChart } from "@/components/charts/FinancialMetricsChart";
import { StockChartCard } from "@/components/stock-chart";

export default function HomePage() {
  // 스크리너 관련
  const { metrics, isLoading: metricsLoading, error: metricsError, search } = useFinancialMetrics();

  // 선택된 종목 (스크리너에서 선택)
  const [selectedStockCode, setSelectedStockCode] = useState<string | null>(null);
  const [selectedCorpCode, setSelectedCorpCode] = useState<string | null>(null);

  // 선택된 종목의 재무 히스토리
  const { history: metricsHistory, isLoading: historyLoading } = useMetricsHistory(selectedCorpCode);

  // 스크리너에서 최신 분기만 표시
  const latestMetrics = useMemo(() => {
    const metricsMap = new Map<string, FinancialMetricRow>();
    metrics.forEach((metric) => {
      const existing = metricsMap.get(metric.corp_code);
      if (!existing) {
        metricsMap.set(metric.corp_code, metric);
      } else {
        const isNewer = metric.year > existing.year || (metric.year === existing.year && metric.quarter > existing.quarter);
        if (isNewer) {
          metricsMap.set(metric.corp_code, metric);
        }
      }
    });
    return Array.from(metricsMap.values());
  }, [metrics]);

  // 선택된 종목 정보
  const selectedMetric = useMemo(() => {
    if (!selectedCorpCode) return null;
    return metrics.find((m) => m.corp_code === selectedCorpCode) ?? null;
  }, [metrics, selectedCorpCode]);

  // 초기 스크리너 데이터 로드
  const searchCallback = useCallback(() => {
    search({});
  }, [search]);

  useEffect(() => {
    searchCallback();
  }, [searchCallback]);

  const handleSelectScreenerStock = (metric: FinancialMetricRow) => {
    setSelectedCorpCode(metric.corp_code);
    setSelectedStockCode(metric.stock_code);
  };

  return (
    <div className="container mx-auto p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-light-gray-90 mb-2">대시보드</h1>
        <p className="text-light-gray-50">재무 지표 기반 종목 분석</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 좌측: 차트 영역 */}
        <div className="col-span-8 space-y-4">
          {/* 주가 차트 (캔들 + 실시간) */}
          <div className="bg-light-gray-0 rounded-lg border border-light-gray-20 p-4">
            <h2 className="text-lg font-semibold text-light-gray-90 mb-3">주가 차트 {selectedStockCode && `- ${selectedStockCode}`}</h2>
            {selectedStockCode ? (
              <div className="h-[300px]">
                <StockChartCard stockCode={selectedStockCode} />
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-light-gray-40">종목을 선택하세요</div>
            )}
          </div>

          {/* 재무 지표 차트 */}
          <div className="bg-light-gray-0 rounded-lg border border-light-gray-20 p-4">
            <h2 className="text-lg font-semibold text-light-gray-90 mb-3">재무 지표 {selectedMetric && `- ${selectedMetric.corp_name}`}</h2>
            {historyLoading ? (
              <div className="h-[200px] flex items-center justify-center text-light-gray-40">로딩 중...</div>
            ) : selectedCorpCode && metricsHistory.length > 0 ? (
              <div className="max-h-[700px] overflow-y-auto">
                <FinancialMetricsChart data={metricsHistory} />
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-light-gray-40">스크리너에서 종목을 선택하세요</div>
            )}
          </div>
        </div>

        {/* 우측: 스크리너 */}
        <div className="col-span-4">
          <div className="bg-light-gray-0 rounded-lg border border-light-gray-20 p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-light-gray-90">스크리너</h2>
              <span className="text-sm text-light-gray-40">{metricsLoading ? "로딩 중..." : `${latestMetrics.length}개 종목`}</span>
            </div>

            {metricsError && <div className="p-3 bg-light-danger-5 border border-light-danger-20 rounded text-light-danger-70 text-sm mb-4">{metricsError}</div>}

            {/* 간단한 테이블 */}
            <div className="overflow-y-auto max-h-[550px]">
              <table className="w-full text-sm">
                <thead className="bg-light-gray-5 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left text-light-gray-70">종목명</th>
                    <th className="px-2 py-2 text-right text-light-gray-70">ROE</th>
                    <th className="px-2 py-2 text-right text-light-gray-70">부채비율</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-gray-20">
                  {latestMetrics.slice(0, 50).map((metric) => {
                    const rowClass = selectedCorpCode === metric.corp_code ? "bg-light-primary-5" : "hover:bg-light-gray-5";
                    return (
                      <tr key={metric.corp_code} onClick={() => handleSelectScreenerStock(metric)} className={`cursor-pointer transition-colors ${rowClass}`}>
                        <td className="px-2 py-2 text-light-gray-90">{metric.corp_name}</td>
                        <td className="px-2 py-2 text-right text-light-gray-90">{metric.roe.toFixed(1)}%</td>
                        <td className="px-2 py-2 text-right text-light-gray-90">{metric.debt_ratio.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
