"use client";

import { useState } from "react";
import { useRealtimePrice } from "@/hooks/useRealtimePrice";

export default function TrackerPage() {
  const { prices, subscribe, unsubscribe, isConnected, isKisConnected, error } = useRealtimePrice();
  const [stockCode, setStockCode] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);

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
  };

  const handleRemove = (code: string) => {
    setWatchlist(watchlist.filter((c) => c !== code));
    unsubscribe(code);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("ko-KR");
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

      {/* 종목 추가 */}
      <div className="bg-light-gray-0 rounded-lg border border-light-gray-20 p-4 mb-6">
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-light-gray-5">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-light-gray-70">종목코드</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-light-gray-70">현재가</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-light-gray-70">전일대비</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-light-gray-70">등락률</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-light-gray-70">거래량</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-light-gray-70">체결시간</th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-light-gray-70">삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-gray-20">
                {watchlist.map((code) => {
                  const price = prices.get(code);
                  return (
                    <tr key={code} className="hover:bg-light-gray-5">
                      <td className="px-4 py-3 text-sm text-light-gray-90 font-medium">{code}</td>
                      {price ? (
                        <>
                          <td className="px-4 py-3 text-sm text-right text-light-gray-90 font-bold">{formatNumber(price.price)}원</td>
                          <td
                            className={`px-4 py-3 text-sm text-right font-medium ${
                              price.changeSign === "rise" ? "text-light-danger-50" : price.changeSign === "fall" ? "text-light-information-50" : "text-light-gray-90"
                            }`}
                          >
                            {price.changeSign === "rise" ? "+" : price.changeSign === "fall" ? "-" : ""}
                            {formatNumber(Math.abs(price.change))}
                          </td>
                          <td
                            className={`px-4 py-3 text-sm text-right font-medium ${
                              price.changeSign === "rise" ? "text-light-danger-50" : price.changeSign === "fall" ? "text-light-information-50" : "text-light-gray-90"
                            }`}
                          >
                            {price.changeSign === "rise" ? "+" : price.changeSign === "fall" ? "-" : ""}
                            {Math.abs(price.changeRate).toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-light-gray-90">{formatNumber(price.volume)}</td>
                          <td className="px-4 py-3 text-sm text-right text-light-gray-50">{formatTime(price.timestamp)}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-sm text-right text-light-gray-40" colSpan={5}>
                            데이터 수신 대기 중...
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleRemove(code)} className="text-light-danger-50 hover:text-light-danger-60 text-sm">
                          삭제
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
