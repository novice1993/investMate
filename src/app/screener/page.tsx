"use client";

import { useState, useMemo } from "react";
import { FinancialMetricsChart } from "@/components/charts/FinancialMetricsChart";
import { useFinancialMetrics, type FinancialMetricRow } from "@/hooks/useFinancialMetrics";

export default function ScreenerPage() {
  const { metrics, loading, error, fetchMetrics } = useFinancialMetrics();
  const [roeMin, setRoeMin] = useState("");
  const [roeMax, setRoeMax] = useState("");
  const [debtRatioMax, setDebtRatioMax] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<FinancialMetricRow | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<FinancialMetricRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 각 기업의 최신 분기 데이터만 필터링
  const latestMetrics = useMemo(() => {
    const metricsMap = new Map<string, FinancialMetricRow>();

    metrics.forEach((metric) => {
      const existing = metricsMap.get(metric.corp_code);

      if (!existing) {
        metricsMap.set(metric.corp_code, metric);
      } else {
        // 더 최신 데이터인지 확인 (연도 > 분기 순서로 비교)
        const isNewer = metric.year > existing.year || (metric.year === existing.year && metric.quarter > existing.quarter);

        if (isNewer) {
          metricsMap.set(metric.corp_code, metric);
        }
      }
    });

    return Array.from(metricsMap.values());
  }, [metrics]);

  const handleSearch = () => {
    fetchMetrics({
      roeMin: roeMin ? parseFloat(roeMin) : undefined,
      roeMax: roeMax ? parseFloat(roeMax) : undefined,
      debtRatioMax: debtRatioMax ? parseFloat(debtRatioMax) : undefined,
    });
  };

  const handleReset = () => {
    setRoeMin("");
    setRoeMax("");
    setDebtRatioMax("");
  };

  const handleSelectMetric = async (metric: FinancialMetricRow) => {
    setSelectedMetric(metric);
    setLoadingHistory(true);

    try {
      const response = await fetch(`/api/financial/metrics/history?corpCode=${metric.corp_code}`);
      const data = await response.json();

      if (data.success) {
        setMetricsHistory(data.data);
      } else {
        console.error("Failed to fetch metrics history:", data.error);
        setMetricsHistory([]);
      }
    } catch (err) {
      console.error("Failed to fetch metrics history:", err);
      setMetricsHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-light-gray-90 mb-2">종목 스크리너</h1>
        <p className="text-light-gray-50">재무 지표로 유망 종목을 발굴하세요</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 필터 사이드바 */}
        <div className="col-span-3 bg-light-gray-0 rounded-lg border border-light-gray-20 p-4">
          <h2 className="text-lg font-semibold text-light-gray-90 mb-4">필터 조건</h2>

          <div className="space-y-4">
            {/* ROE 필터 */}
            <div>
              <label className="block text-sm font-medium text-light-gray-70 mb-2">ROE (%)</label>
              <div className="flex flex-col space-y-2">
                <input type="number" placeholder="최소" value={roeMin} onChange={(e) => setRoeMin(e.target.value)} className="w-full border border-light-gray-30 rounded px-2 py-1 text-sm" />
                <input type="number" placeholder="최대" value={roeMax} onChange={(e) => setRoeMax(e.target.value)} className="w-full border border-light-gray-30 rounded px-2 py-1 text-sm" />
              </div>
            </div>

            {/* 부채비율 필터 */}
            <div>
              <label className="block text-sm font-medium text-light-gray-70 mb-2">부채비율 (%)</label>
              <input type="number" placeholder="최대" value={debtRatioMax} onChange={(e) => setDebtRatioMax(e.target.value)} className="w-full border border-light-gray-30 rounded px-2 py-1 text-sm" />
            </div>

            {/* 버튼 */}
            <div className="space-y-2">
              <button onClick={handleSearch} className="w-full bg-light-primary-50 text-light-gray-0 py-2 rounded hover:bg-light-primary-60 transition-colors">
                검색
              </button>
              <button onClick={handleReset} className="w-full bg-light-gray-10 text-light-gray-70 py-2 rounded hover:bg-light-gray-20 transition-colors">
                초기화
              </button>
            </div>
          </div>
        </div>

        {/* 결과 테이블 */}
        <div className="col-span-9 bg-light-gray-0 rounded-lg border border-light-gray-20 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-light-gray-90">필터링 결과</h2>
            <span className="text-sm text-light-gray-40">{loading ? "검색 중..." : `총 ${latestMetrics.length}개 종목`}</span>
          </div>

          {/* 에러 */}
          {error && <div className="p-4 bg-light-danger-5 border border-light-danger-20 rounded text-light-danger-70 text-sm">{error}</div>}

          {/* 로딩 */}
          {loading && <div className="p-8 text-center text-light-gray-40">데이터를 불러오는 중...</div>}

          {/* 데이터 없음 */}
          {!loading && !error && latestMetrics.length === 0 && <div className="p-8 text-center text-light-gray-40">검색 조건에 맞는 종목이 없습니다</div>}

          {/* 테이블 (러프하게!) */}
          {!loading && latestMetrics.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-light-gray-5">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-light-gray-70">종목명</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-light-gray-70">종목코드</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-light-gray-70">ROE (%)</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-light-gray-70">부채비율 (%)</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-light-gray-70">영업이익률 (%)</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-light-gray-70">순이익률 (%)</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-light-gray-70">매출 YoY (%)</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-light-gray-70">영업이익 YoY (%)</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-light-gray-70">순이익 YoY (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-gray-20">
                  {latestMetrics.map((metric) => (
                    <tr
                      key={`${metric.corp_code}-${metric.year}-${metric.quarter}`}
                      onClick={() => handleSelectMetric(metric)}
                      className={`cursor-pointer transition-colors ${
                        selectedMetric?.corp_code === metric.corp_code ? "bg-light-primary-5 border-l-4 border-l-light-primary-50" : "hover:bg-light-gray-5"
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-light-gray-90">{metric.corp_name}</td>
                      <td className="px-4 py-3 text-sm text-light-gray-50">{metric.stock_code}</td>
                      <td className="px-4 py-3 text-sm text-right text-light-gray-90 font-medium">{metric.roe.toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm text-right text-light-gray-90">{metric.debt_ratio.toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm text-right text-light-gray-90">{metric.operating_margin.toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm text-right text-light-gray-90">{metric.net_margin.toFixed(1)}</td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${metric.revenue_yoy >= 0 ? "text-light-information-50" : "text-light-danger-50"}`}>
                        {metric.revenue_yoy >= 0 ? "+" : ""}
                        {metric.revenue_yoy.toFixed(1)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${metric.operating_profit_yoy >= 0 ? "text-light-information-50" : "text-light-danger-50"}`}>
                        {metric.operating_profit_yoy >= 0 ? "+" : ""}
                        {metric.operating_profit_yoy.toFixed(1)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${metric.net_income_yoy >= 0 ? "text-light-information-50" : "text-light-danger-50"}`}>
                        {metric.net_income_yoy >= 0 ? "+" : ""}
                        {metric.net_income_yoy.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 선택된 종목 상세 차트 */}
        {selectedMetric && (
          <div className="col-span-12 bg-light-gray-0 rounded-lg border border-light-gray-20 p-6 mt-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-light-gray-90">{selectedMetric.corp_name}</h2>
                <p className="text-sm text-light-gray-50 mt-1">종목코드: {selectedMetric.stock_code}</p>
              </div>
              <button onClick={() => setSelectedMetric(null)} className="text-light-gray-50 hover:text-light-gray-70 text-sm">
                닫기
              </button>
            </div>

            {loadingHistory ? <div className="p-8 text-center text-light-gray-40">데이터를 불러오는 중...</div> : <FinancialMetricsChart data={metricsHistory} />}
          </div>
        )}
      </div>
    </div>
  );
}
