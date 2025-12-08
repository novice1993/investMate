"use client";

import { useState, useMemo } from "react";
import { useRealtimePrice } from "@/components/stock-chart/useRealtimePrice";
import { MonitoringStockCard } from "./components/MonitoringStockCard";
import { StockDetailPanel } from "./components/StockDetailPanel";
import { useScreenedStocks, type ScreenedStock } from "./useScreenedStocks";
import { useSignalAlert } from "./useSignalAlert";

// ============================================================================
// Types
// ============================================================================

type FilterType = "all" | "rsi" | "golden" | "volume";

// ============================================================================
// Page Component
// ============================================================================

export default function MonitoringPage() {
  // 선별 종목 데이터
  const { stocks, isLoading, error } = useScreenedStocks();

  // 실시간 가격 데이터
  const { prices, isConnected, isKisConnected } = useRealtimePrice();

  // 시그널 알림 데이터
  const { signals, rsiCount, goldenCrossCount, volumeSpikeCount } = useSignalAlert();

  // 선택된 종목 (상세 패널용)
  const [selectedStock, setSelectedStock] = useState<ScreenedStock | null>(null);

  // 필터 상태
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // 시그널 기반 필터링
  const filteredStocks = useMemo(() => {
    if (activeFilter === "all") return stocks;

    return stocks.filter((stock) => {
      const signal = signals.get(stock.stockCode);
      if (!signal) return false;

      switch (activeFilter) {
        case "rsi":
          return signal.rsiOversold;
        case "golden":
          return signal.goldenCross;
        case "volume":
          return signal.volumeSpike;
        default:
          return true;
      }
    });
  }, [stocks, activeFilter, signals]);

  // 연결 상태 표시
  const connectionStatus = useMemo(() => {
    if (!isConnected) return { text: "서버 연결 중...", color: "bg-light-warning-50" };
    if (!isKisConnected) return { text: "장 마감", color: "bg-light-gray-40" };
    return { text: "실시간", color: "bg-light-success-50" };
  }, [isConnected, isKisConnected]);

  return (
    <div className="container mx-auto p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-light-gray-90 mb-2">실시간 모니터링</h1>
            <p className="text-light-gray-50">선별 종목 실시간 시세 및 기술적 지표 감시</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${connectionStatus.color}`} />
            <span className="text-sm text-light-gray-50">{connectionStatus.text}</span>
          </div>
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="mb-6 flex gap-2">
        <FilterTab active={activeFilter === "all"} onClick={() => setActiveFilter("all")}>
          전체 ({stocks.length})
        </FilterTab>
        <FilterTab active={activeFilter === "rsi"} onClick={() => setActiveFilter("rsi")} badge={String(rsiCount)} badgeColor="danger">
          RSI 과매도
        </FilterTab>
        <FilterTab active={activeFilter === "golden"} onClick={() => setActiveFilter("golden")} badge={String(goldenCrossCount)} badgeColor="success">
          골든크로스
        </FilterTab>
        <FilterTab active={activeFilter === "volume"} onClick={() => setActiveFilter("volume")} badge={String(volumeSpikeCount)} badgeColor="warning">
          거래량 급등
        </FilterTab>
      </div>

      {/* 에러 표시 */}
      {error && (
        <div className="mb-6 p-4 bg-light-danger-5 border border-light-danger-20 rounded-lg">
          <p className="text-light-danger-60 text-sm">{error}</p>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      <div className="grid grid-cols-12 gap-6">
        {/* 종목 그리드 */}
        <div className={selectedStock ? "col-span-8" : "col-span-12"}>
          {isLoading ? (
            <div className="flex items-center justify-center h-64 bg-light-gray-0 rounded-lg border border-light-gray-20">
              <p className="text-light-gray-40">선별 종목 로딩 중...</p>
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="flex items-center justify-center h-64 bg-light-gray-0 rounded-lg border border-light-gray-20">
              <p className="text-light-gray-40">선별된 종목이 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredStocks.map((stock) => (
                <MonitoringStockCard
                  key={stock.stockCode}
                  stock={stock}
                  realtimePrice={prices.get(stock.stockCode)}
                  isSelected={selectedStock?.stockCode === stock.stockCode}
                  onClick={() => setSelectedStock(stock)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 상세 패널 (종목 선택 시) */}
        {selectedStock && (
          <div className="col-span-4">
            <StockDetailPanel stock={selectedStock} realtimePrice={prices.get(selectedStock.stockCode)} onClose={() => setSelectedStock(null)} />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Sub Components
// ============================================================================

interface FilterTabProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: string;
  badgeColor?: "danger" | "success" | "warning";
}

function FilterTab({ active, onClick, children, badge, badgeColor }: FilterTabProps) {
  const badgeColorClass = {
    danger: "bg-light-danger-50 text-light-gray-0",
    success: "bg-light-success-50 text-light-gray-0",
    warning: "bg-light-warning-50 text-light-gray-90",
  };

  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-lg text-sm font-medium transition-colors
        flex items-center gap-2
        ${active ? "bg-light-primary-50 text-light-gray-0" : "bg-light-gray-5 text-light-gray-60 hover:bg-light-gray-10"}
      `}
    >
      {children}
      {badge && badge !== "0" && <span className={`px-1.5 py-0.5 rounded text-xs ${badgeColorClass[badgeColor || "danger"]}`}>{badge}</span>}
    </button>
  );
}
