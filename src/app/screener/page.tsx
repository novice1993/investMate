"use client";

import { useState } from "react";
import { useFinancialMetrics, type FinancialMetricRow } from "@/hooks/useFinancialMetrics";

export default function ScreenerPage() {
  const { metrics, loading, error, fetchMetrics } = useFinancialMetrics();
  const [roeMin, setRoeMin] = useState("");
  const [roeMax, setRoeMax] = useState("");
  const [debtRatioMax, setDebtRatioMax] = useState("");

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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">종목 스크리너</h1>
        <p className="text-gray-600">재무 지표로 유망 종목을 발굴하세요</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 필터 사이드바 */}
        <div className="col-span-3 bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">필터 조건</h2>

          <div className="space-y-4">
            {/* ROE 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ROE (%)</label>
              <div className="flex space-x-2">
                <input type="number" placeholder="최소" value={roeMin} onChange={(e) => setRoeMin(e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" />
                <input type="number" placeholder="최대" value={roeMax} onChange={(e) => setRoeMax(e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" />
              </div>
            </div>

            {/* 부채비율 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">부채비율 (%)</label>
              <input type="number" placeholder="최대" value={debtRatioMax} onChange={(e) => setDebtRatioMax(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
            </div>

            {/* 버튼 */}
            <div className="space-y-2">
              <button onClick={handleSearch} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors">
                검색
              </button>
              <button onClick={handleReset} className="w-full bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300 transition-colors">
                초기화
              </button>
            </div>
          </div>
        </div>

        {/* 결과 테이블 */}
        <div className="col-span-9 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">필터링 결과</h2>
            <span className="text-sm text-gray-500">{loading ? "검색 중..." : `총 ${metrics.length}개 종목`}</span>
          </div>

          {/* 에러 */}
          {error && <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}

          {/* 로딩 */}
          {loading && <div className="p-8 text-center text-gray-500">데이터를 불러오는 중...</div>}

          {/* 데이터 없음 */}
          {!loading && !error && metrics.length === 0 && <div className="p-8 text-center text-gray-500">검색 조건에 맞는 종목이 없습니다</div>}

          {/* 테이블 (러프하게!) */}
          {!loading && metrics.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">종목명</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">종목코드</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">ROE (%)</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">부채비율 (%)</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">영업이익률 (%)</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">순이익률 (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {metrics.map((metric) => (
                    <tr key={metric.corp_code} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3 text-sm text-gray-900">{metric.corp_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{metric.stock_code}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium">{metric.roe.toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{metric.debt_ratio.toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{metric.operating_margin.toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{metric.net_margin.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
