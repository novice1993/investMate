"use client";

import { AnimatePresence } from "motion/react";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { AnimatedList, AnimatedListItem, SlideIn } from "@/components/animation";
import { ConnectionStatus } from "@/components/dashboard/ConnectionStatus";
import { FilterTabs } from "@/components/dashboard/FilterTabs";
import { MobileMenu } from "@/components/dashboard/MobileMenu";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { StockCard } from "@/components/dashboard/StockCard";
import { StockDetailPanel } from "@/components/dashboard/StockDetailPanel";
import { StockSearch } from "@/components/dashboard/StockSearch";
import { useRealtimePrice } from "@/components/stockChart/useRealtimePrice";
import type { KospiStock } from "@/hooks/useKospiStocks";
import { useScreenedStocks, type ScreenedStock } from "@/hooks/useScreenedStocks";
import { useSignalAlert, type SignalAlert } from "@/hooks/useSignalAlert";

// ============================================================================
// Types
// ============================================================================

export type FilterType = "all" | "rsi" | "golden" | "volume";

/** 상세 패널에 표시할 종목 (선별 종목 or 검색 종목) */
type SelectedStock = { type: "screened"; stock: ScreenedStock } | { type: "searched"; stock: KospiStock };

// ============================================================================
// Page Component
// ============================================================================

export default function DashboardPage() {
  // 선별 종목 데이터
  const { stocks, isLoading, error } = useScreenedStocks();

  // 실시간 가격 데이터
  const { prices, isConnected, isKisConnected } = useRealtimePrice();

  // 선택된 종목 (상세 패널용) - 선별 종목 or 검색 종목
  const [selectedStock, setSelectedStock] = useState<SelectedStock | null>(null);

  // StockCard ref 관리 (스크롤용)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // 종목 코드 → 종목명 매핑
  const stockNameMap = useMemo(() => {
    const map = new Map<string, string>();
    stocks.forEach((s) => map.set(s.stockCode, s.corpName));
    return map;
  }, [stocks]);

  // 시그널 토스트 핸들러
  const handleSignalAlert = useCallback(
    (alert: SignalAlert, corpName?: string) => {
      const name = corpName || alert.stockCode;
      const signals: string[] = [];

      if (alert.triggers.rsiOversold) signals.push("RSI 과매도");
      if (alert.triggers.goldenCross) signals.push("골든크로스");
      if (alert.triggers.volumeSpike) signals.push("거래량 급등");

      const signalText = signals.join(", ");

      toast.info(`${name}`, {
        description: signalText,
        action: {
          label: "확인",
          onClick: () => {
            // 해당 종목으로 포커스 이동
            const stock = stocks.find((s) => s.stockCode === alert.stockCode);
            if (stock) {
              setSelectedStock({ type: "screened", stock });
            }
          },
        },
      });
    },
    [stocks]
  );

  // 시그널 알림 데이터
  const { signals, recentAlerts, unreadCount, rsiCount, goldenCrossCount, volumeSpikeCount, markAsRead, markAllAsRead } = useSignalAlert({
    onNewAlert: handleSignalAlert,
    stockNameMap,
  });

  // 필터 상태
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // 선별 종목 코드 Set (검색 결과에서 구분용)
  const screenedStockCodes = useMemo(() => new Set(stocks.map((s) => s.stockCode)), [stocks]);

  // 선별 종목 클릭 핸들러
  const handleScreenedStockClick = useCallback((stock: ScreenedStock) => {
    setSelectedStock({ type: "screened", stock });
  }, []);

  // 검색 종목 선택 핸들러
  const handleSearchSelect = useCallback(
    (kospiStock: KospiStock) => {
      // 선별 종목이면 해당 데이터로 열기
      const screenedStock = stocks.find((s) => s.stockCode === kospiStock.stockCode);
      if (screenedStock) {
        setSelectedStock({ type: "screened", stock: screenedStock });
      } else {
        setSelectedStock({ type: "searched", stock: kospiStock });
      }
    },
    [stocks]
  );

  // 알림 클릭 시 종목 포커싱 핸들러
  const handleAlertStockClick = useCallback(
    (stockCode: string) => {
      const stock = stocks.find((s) => s.stockCode === stockCode);
      if (stock) {
        setSelectedStock({ type: "screened", stock });
      }
    },
    [stocks]
  );

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

  // ref 콜백 생성 함수
  const createCardRefCallback = useCallback(
    (stockCode: string) => (el: HTMLDivElement | null) => {
      if (el) {
        cardRefs.current.set(stockCode, el);
      } else {
        cardRefs.current.delete(stockCode);
      }
    },
    []
  );

  // 선택된 종목 변경 시 해당 카드로 스크롤 (Desktop만)
  useEffect(() => {
    if (!selectedStock || selectedStock.type !== "screened") return;

    // 모바일에서는 전체화면 모달이므로 스크롤 불필요
    const isDesktop = window.innerWidth >= 1024; // lg breakpoint
    if (!isDesktop) return;

    const stockCode = selectedStock.stock.stockCode;
    const element = cardRefs.current.get(stockCode);

    if (element) {
      // 약간의 딜레이 후 스크롤 (레이아웃 변경 후)
      setTimeout(() => {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [selectedStock]);

  return (
    <div className="min-h-screen bg-light-gray-5">
      {/* 통합 Nav */}
      <nav className="sticky top-0 z-50 border-b border-light-gray-20 bg-light-gray-0">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center h-14 gap-4">
            {/* 로고 */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-light-primary-50 flex items-center justify-center">
                <span className="text-light-gray-0 font-bold text-sm">iM</span>
              </div>
              <span className="text-lg font-bold text-light-gray-90 hidden sm:block">investMate</span>
            </div>

            {/* 검색바 (항상 표시, 반응형 너비) */}
            <div className="flex-1 min-w-[120px] max-w-[160px] sm:max-w-[200px] md:max-w-[256px] md:flex-none md:w-64">
              <StockSearch onSelect={handleSearchSelect} screenedStockCodes={screenedStockCodes} />
            </div>

            {/* Desktop: 필터 버튼들 */}
            <div className="hidden lg:flex items-center gap-2 flex-1">
              <FilterTabs
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                totalCount={stocks.length}
                rsiCount={rsiCount}
                goldenCrossCount={goldenCrossCount}
                volumeSpikeCount={volumeSpikeCount}
              />
            </div>

            {/* 우측 영역 */}
            <div className="flex items-center gap-2 ml-auto shrink-0">
              {/* Desktop: 연결상태 */}
              <div className="hidden md:block">
                <ConnectionStatus isConnected={isConnected} isKisConnected={isKisConnected} />
              </div>

              {/* 알림 (항상 표시) */}
              <NotificationBell alerts={recentAlerts} stocks={stocks} unreadCount={unreadCount} onMarkAllAsRead={markAllAsRead} onMarkAsRead={markAsRead} onAlertClick={handleAlertStockClick} />

              {/* Mobile: 햄버거 메뉴 */}
              <div className="lg:hidden">
                <MobileMenu
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                  totalCount={stocks.length}
                  rsiCount={rsiCount}
                  goldenCrossCount={goldenCrossCount}
                  volumeSpikeCount={volumeSpikeCount}
                  isConnected={isConnected}
                  isKisConnected={isKisConnected}
                />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 에러 표시 */}
      {error && (
        <div className="container mx-auto px-6 py-3">
          <div className="p-4 bg-light-danger-5 border border-light-danger-20 rounded-lg">
            <p className="text-light-danger-60 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          {/* 좌측: 종목 그리드 */}
          <div className={selectedStock ? "col-span-12 lg:col-span-8" : "col-span-12"}>
            {isLoading ? (
              <div className="flex items-center justify-center h-64 bg-light-gray-0 rounded-lg border border-light-gray-20">
                <p className="text-light-gray-40">선별 종목 로딩 중...</p>
              </div>
            ) : filteredStocks.length === 0 ? (
              <div className="flex items-center justify-center h-64 bg-light-gray-0 rounded-lg border border-light-gray-20">
                <p className="text-light-gray-40">{activeFilter === "all" ? "선별된 종목이 없습니다" : "해당 시그널 종목이 없습니다"}</p>
              </div>
            ) : (
              <AnimatedList className={`grid gap-3 md:gap-4 ${selectedStock ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
                {filteredStocks.map((stock) => (
                  <AnimatedListItem key={stock.stockCode} itemKey={stock.stockCode}>
                    <StockCard
                      ref={createCardRefCallback(stock.stockCode)}
                      stock={stock}
                      realtimePrice={prices.get(stock.stockCode)}
                      signal={signals.get(stock.stockCode)}
                      isSelected={selectedStock?.stock.stockCode === stock.stockCode}
                      onClick={() => handleScreenedStockClick(stock)}
                    />
                  </AnimatedListItem>
                ))}
              </AnimatedList>
            )}
          </div>

          {/* 우측: 상세 패널 (종목 선택 시) - Desktop: 우측 고정, Mobile: 전체화면 모달 */}
          <AnimatePresence>
            {selectedStock && (
              <>
                {/* Mobile: 전체화면 오버레이 */}
                <div className="lg:hidden fixed inset-0 z-50 bg-light-gray-5 overflow-y-auto">
                  <div className="p-4">
                    {selectedStock.type === "screened" ? (
                      <StockDetailPanel
                        stock={selectedStock.stock}
                        realtimePrice={prices.get(selectedStock.stock.stockCode)}
                        signal={signals.get(selectedStock.stock.stockCode)}
                        onClose={() => setSelectedStock(null)}
                      />
                    ) : (
                      <StockDetailPanel
                        stock={{
                          ...selectedStock.stock,
                          roe: 0,
                          debtRatio: 0,
                          operatingMargin: 0,
                        }}
                        isSearchedStock
                        onClose={() => setSelectedStock(null)}
                      />
                    )}
                  </div>
                </div>

                {/* Desktop: 우측 패널 */}
                <SlideIn direction="right" className="hidden lg:block col-span-4">
                  {selectedStock.type === "screened" ? (
                    <StockDetailPanel
                      stock={selectedStock.stock}
                      realtimePrice={prices.get(selectedStock.stock.stockCode)}
                      signal={signals.get(selectedStock.stock.stockCode)}
                      onClose={() => setSelectedStock(null)}
                    />
                  ) : (
                    <StockDetailPanel
                      stock={{
                        ...selectedStock.stock,
                        roe: 0,
                        debtRatio: 0,
                        operatingMargin: 0,
                      }}
                      isSearchedStock
                      onClose={() => setSelectedStock(null)}
                    />
                  )}
                </SlideIn>
              </>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
