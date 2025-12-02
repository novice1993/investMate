"use client";

import { useState, useEffect, useRef } from "react";
import { RealtimePriceChart } from "@/components/charts/RealtimePriceChart";
import { RealtimePrice } from "@/core/entities/stock-price.entity";
import { useRealtimePrice } from "./useRealtimePrice";

interface PriceHistory {
  timestamp: string;
  price: number;
}

export default function TrackerPage() {
  const { prices, subscribe, unsubscribe, isConnected, isKisConnected, error } = useRealtimePrice();
  const [stockCode, setStockCode] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [priceHistoryMap, setPriceHistoryMap] = useState<Map<string, PriceHistory[]>>(new Map());
  const prevPricesRef = useRef<Map<string, RealtimePrice>>(new Map());

  // 실시간 가격 업데이트 시 히스토리에 추가
  useEffect(() => {
    prices.forEach((priceData, code) => {
      const prevPrice = prevPricesRef.current.get(code);

      // 가격이 변경되었을 때만 히스토리에 추가
      if (!prevPrice || prevPrice.price !== priceData.price) {
        setPriceHistoryMap((prev) => {
          const newMap = new Map(prev);
          const history = newMap.get(code) || [];
          const newHistory = [
            ...history,
            {
              timestamp: priceData.timestamp,
              price: priceData.price,
            },
          ].slice(-100); // 최근 100개만 유지
          newMap.set(code, newHistory);
          return newMap;
        });
      }
    });

    prevPricesRef.current = new Map(prices);
  }, [prices]);

  const handleAdd = () => {
    const code = stockCode.trim();
    if (!code) return;

    // 6자리 종목코드 검증
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

    // 첫 번째 종목 추가 시 자동 선택
    if (watchlist.length === 0) {
      setSelectedStock(code);
    }
  };

  const handleRemove = (code: string) => {
    setWatchlist(watchlist.filter((c) => c !== code));
    unsubscribe(code);

    // 선택된 종목이 삭제되면 선택 해제
    if (selectedStock === code) {
      setSelectedStock(null);
    }
  };

  const handleSelectStock = (code: string) => {
    setSelectedStock(code);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("ko-KR");
  };

  return (
    <div className="container mx-auto p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-light-gray-90 mb-2">실시간 시세</h1>
            <p className="text-light-gray-50">한국투자증권 WebSocket 실시간 체결가</p>
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

        {/* 에러 메시지 */}
        {error && (
          <div className="mt-4 p-4 bg-light-warning-5 border border-light-warning-20 rounded-lg">
            <div className="flex items-start space-x-2">
              <span className="text-light-warning-40 text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm text-light-warning-80 font-medium">{error}</p>
                <p className="text-xs text-light-warning-70 mt-1">평일 09:00 ~ 15:30 장 시간에만 실시간 데이터를 수신할 수 있습니다.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 좌측: 관심 종목 리스트 */}
        <div className="col-span-5 space-y-6">
          {/* 종목 추가 */}
          <div className="bg-light-gray-0 rounded-lg border border-light-gray-20 p-4">
            <h2 className="text-lg font-semibold text-light-gray-90 mb-3">종목 추가</h2>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="종목코드 입력 (예: 005930)"
                value={stockCode}
                onChange={(e) => setStockCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="flex-1 border border-light-gray-30 rounded px-3 py-2 text-sm"
                maxLength={6}
              />
              <button
                onClick={handleAdd}
                disabled={!isConnected || !isKisConnected}
                className="bg-light-primary-50 text-light-gray-0 px-4 py-2 rounded hover:bg-light-primary-60 transition-colors disabled:bg-light-gray-40 disabled:cursor-not-allowed"
              >
                추가
              </button>
            </div>
            <p className="text-xs text-light-gray-40 mt-2">예) 삼성전자: 005930, SK하이닉스: 000660, NAVER: 035420</p>
          </div>

          {/* 관심 종목 테이블 */}
          <div className="bg-light-gray-0 rounded-lg border border-light-gray-20 p-4">
            <h2 className="text-lg font-semibold text-light-gray-90 mb-3">관심 종목 ({watchlist.length})</h2>

            {watchlist.length === 0 ? (
              <div className="p-8 text-center text-light-gray-40">종목을 추가해주세요</div>
            ) : (
              <div className="space-y-2">
                {watchlist.map((code) => {
                  const price = prices.get(code);
                  const isSelected = selectedStock === code;
                  return (
                    <div
                      key={code}
                      onClick={() => handleSelectStock(code)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? "border-light-primary-50 bg-light-primary-5" : "border-light-gray-20 hover:bg-light-gray-5"}`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-light-gray-90">{code}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(code);
                          }}
                          className="text-light-danger-50 hover:text-light-danger-60 text-xs"
                        >
                          삭제
                        </button>
                      </div>
                      {price ? (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-light-gray-50">현재가</span>
                            <span className="text-sm font-bold text-light-gray-90">{formatNumber(price.price)}원</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-light-gray-50">등락률</span>
                            <span
                              className={`text-sm font-medium ${
                                price.changeSign === "rise" ? "text-light-danger-50" : price.changeSign === "fall" ? "text-light-information-50" : "text-light-gray-90"
                              }`}
                            >
                              {price.changeSign === "rise" ? "+" : price.changeSign === "fall" ? "-" : ""}
                              {Math.abs(price.changeRate).toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-light-gray-40">데이터 수신 대기 중...</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 우측: 실시간 차트 */}
        <div className="col-span-7">
          <div className="bg-light-gray-0 rounded-lg border border-light-gray-20 p-4 h-full">
            {selectedStock ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-light-gray-90">실시간 차트 - {selectedStock}</h2>
                  {prices.get(selectedStock) && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-light-gray-90">{formatNumber(prices.get(selectedStock)!.price)}원</div>
                      <div
                        className={`text-sm font-medium ${
                          prices.get(selectedStock)!.changeSign === "rise"
                            ? "text-light-danger-50"
                            : prices.get(selectedStock)!.changeSign === "fall"
                              ? "text-light-information-50"
                              : "text-light-gray-90"
                        }`}
                      >
                        {prices.get(selectedStock)!.changeSign === "rise" ? "+" : prices.get(selectedStock)!.changeSign === "fall" ? "-" : ""}
                        {Math.abs(prices.get(selectedStock)!.changeRate).toFixed(2)}%
                      </div>
                    </div>
                  )}
                </div>
                <div className="h-[500px]">
                  <RealtimePriceChart data={priceHistoryMap.get(selectedStock) || []} />
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-light-gray-40">종목을 선택하면 실시간 차트가 표시됩니다</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
