"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useFinancialMetrics, type FinancialMetricRow } from "@/app/screener/useFinancialMetrics";
import { useMetricsHistory } from "@/app/screener/useMetricsHistory";
import { useDailyPrices } from "@/app/tracker/useDailyPrices";
import { useRealtimePrice } from "@/app/tracker/useRealtimePrice";
import { FinancialMetricsChart } from "@/components/charts/FinancialMetricsChart";
import { StockPriceChart } from "@/components/charts/StockPriceChart";
import { RealtimePrice } from "@/core/entities/stock-price.entity";

interface PriceHistory {
  timestamp: string;
  price: number;
  volume: number;
}

export default function HomePage() {
  // 실시간 시세 관련
  const { prices, subscribe, unsubscribe, isConnected, isKisConnected, error: realtimeError } = useRealtimePrice();
  const [stockCode, setStockCode] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [priceHistoryMap, setPriceHistoryMap] = useState<Map<string, PriceHistory[]>>(new Map());
  const prevPricesRef = useRef<Map<string, RealtimePrice>>(new Map());

  // 스크리너 관련
  const { metrics, isLoading: metricsLoading, error: metricsError, search } = useFinancialMetrics();

  // 선택된 종목 (워치리스트 또는 스크리너에서 선택)
  const [selectedStockCode, setSelectedStockCode] = useState<string | null>(null);
  const [selectedCorpCode, setSelectedCorpCode] = useState<string | null>(null);

  // 선택된 종목의 재무 히스토리
  const { history: metricsHistory, isLoading: historyLoading } = useMetricsHistory(selectedCorpCode);

  // 선택된 종목의 일봉 데이터
  const { candleData, isLoading: candleLoading } = useDailyPrices(selectedStockCode);

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

  // 실시간 가격 히스토리 업데이트
  useEffect(() => {
    prices.forEach((priceData, code) => {
      const prevPrice = prevPricesRef.current.get(code);
      if (!prevPrice || prevPrice.price !== priceData.price) {
        setPriceHistoryMap((prev) => {
          const newMap = new Map(prev);
          const history = newMap.get(code) || [];
          const newHistory = [...history, { timestamp: priceData.timestamp, price: priceData.price, volume: priceData.volume }].slice(-100);
          newMap.set(code, newHistory);
          return newMap;
        });
      }
    });
    prevPricesRef.current = new Map(prices);
  }, [prices]);

  // 초기 스크리너 데이터 로드
  const searchCallback = useCallback(() => {
    search({});
  }, [search]);

  useEffect(() => {
    searchCallback();
  }, [searchCallback]);

  const handleAddStock = () => {
    const code = stockCode.trim();
    if (!code) return;
    if (code.length !== 6 || isNaN(Number(code))) {
      alert("6자리 숫자 종목코드를 입력하세요 (예: 005930)");
      return;
    }
    if (watchlist.includes(code)) {
      alert("이미 추가된 종목입니다");
      return;
    }
    setWatchlist([...watchlist, code]);
    subscribe(code);
    setStockCode("");
    if (!selectedStockCode) {
      setSelectedStockCode(code);
    }
  };

  const handleRemoveStock = (code: string) => {
    setWatchlist(watchlist.filter((c) => c !== code));
    unsubscribe(code);
    if (selectedStockCode === code) {
      setSelectedStockCode(null);
    }
  };

  const handleSelectWatchlistStock = (code: string) => {
    setSelectedStockCode(code);
    setSelectedCorpCode(null);
  };

  const handleSelectScreenerStock = (metric: FinancialMetricRow) => {
    setSelectedCorpCode(metric.corp_code);
    setSelectedStockCode(metric.stock_code);
    if (!watchlist.includes(metric.stock_code)) {
      setWatchlist([...watchlist, metric.stock_code]);
      subscribe(metric.stock_code);
    }
  };

  const formatNumber = (num: number) => num.toLocaleString("ko-KR");

  const getChangeColor = (changeSign: string) => {
    if (changeSign === "rise") return "text-light-danger-50";
    if (changeSign === "fall") return "text-light-information-50";
    return "text-light-gray-90";
  };

  return (
    <div className="container mx-auto p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-light-gray-90 mb-2">대시보드</h1>
            <p className="text-light-gray-50">실시간 시세와 재무 지표를 한눈에</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-light-success-50" : "bg-light-danger-50"}`}></div>
              <span className="text-sm text-light-gray-50">서버: {isConnected ? "연결됨" : "연결 안됨"}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isKisConnected ? "bg-light-success-50" : "bg-light-warning-40"}`}></div>
              <span className="text-sm text-light-gray-50">KIS: {isKisConnected ? "개장" : "폐장"}</span>
            </div>
          </div>
        </div>

        {realtimeError && (
          <div className="mt-4 p-4 bg-light-warning-5 border border-light-warning-20 rounded-lg">
            <p className="text-sm text-light-warning-80">{realtimeError}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 좌측: 워치리스트 */}
        <div className="col-span-3 space-y-4">
          {/* 종목 추가 */}
          <div className="bg-light-gray-0 rounded-lg border border-light-gray-20 p-4">
            <h2 className="text-lg font-semibold text-light-gray-90 mb-3">워치리스트</h2>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="종목코드 (예: 005930)"
                value={stockCode}
                onChange={(e) => setStockCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddStock()}
                className="flex-1 border border-light-gray-30 rounded px-3 py-2 text-sm"
                maxLength={6}
              />
              <button
                onClick={handleAddStock}
                disabled={!isConnected || !isKisConnected}
                className="bg-light-primary-50 text-light-gray-0 px-3 py-2 rounded hover:bg-light-primary-60 transition-colors disabled:bg-light-gray-40 disabled:cursor-not-allowed text-sm"
              >
                추가
              </button>
            </div>
          </div>

          {/* 워치리스트 목록 */}
          <div className="bg-light-gray-0 rounded-lg border border-light-gray-20 p-4 max-h-[500px] overflow-y-auto">
            {watchlist.length === 0 ? (
              <div className="p-4 text-center text-light-gray-40 text-sm">종목을 추가해주세요</div>
            ) : (
              <div className="space-y-2">
                {watchlist.map((code) => {
                  const price = prices.get(code);
                  const isSelected = selectedStockCode === code;
                  const containerClass = isSelected ? "border-light-primary-50 bg-light-primary-5" : "border-light-gray-20 hover:bg-light-gray-5";
                  return (
                    <div key={code} onClick={() => handleSelectWatchlistStock(code)} className={`p-3 rounded-lg border cursor-pointer transition-colors ${containerClass}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-light-gray-90">{code}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveStock(code);
                          }}
                          className="text-light-danger-50 hover:text-light-danger-60 text-xs"
                        >
                          삭제
                        </button>
                      </div>
                      {price ? (
                        <div className="mt-2 flex justify-between items-center">
                          <span className="text-sm font-bold text-light-gray-90">{formatNumber(price.price)}원</span>
                          <span className={`text-sm font-medium ${getChangeColor(price.changeSign)}`}>
                            {price.changeSign === "rise" ? "+" : price.changeSign === "fall" ? "-" : ""}
                            {Math.abs(price.changeRate).toFixed(2)}%
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-light-gray-40 mt-1">대기 중...</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 중앙: 차트 영역 */}
        <div className="col-span-5 space-y-4">
          {/* 주가 차트 (캔들 + 실시간) */}
          <div className="bg-light-gray-0 rounded-lg border border-light-gray-20 p-4">
            <h2 className="text-lg font-semibold text-light-gray-90 mb-3">주가 차트 {selectedStockCode && `- ${selectedStockCode}`}</h2>
            {selectedStockCode ? (
              <div className="h-[300px]">
                {candleLoading ? (
                  <div className="h-full flex items-center justify-center text-light-gray-40">일봉 데이터 로딩 중...</div>
                ) : (
                  <StockPriceChart candleData={candleData} realtimeData={priceHistoryMap.get(selectedStockCode) || []} />
                )}
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
