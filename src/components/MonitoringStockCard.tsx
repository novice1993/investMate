"use client";

import { memo, useMemo } from "react";
import { SparklineChart } from "@/components/SparklineChart";
import { useDailyPrices } from "@/components/stock-chart/useDailyPrices";
import type { RealtimePrice } from "@/core/entities/stock-price.entity";
import type { ScreenedStock } from "@/hooks/useScreenedStocks";

// ============================================================================
// Types
// ============================================================================

interface MonitoringStockCardProps {
  stock: ScreenedStock;
  realtimePrice?: RealtimePrice;
  isSelected: boolean;
  onClick: () => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * 모니터링 종목 카드
 * - 종목명, 실시간 가격, 등락률
 * - 미니 스파크라인 차트 (추후 구현)
 * - 기술지표 뱃지 (추후 구현)
 */
export const MonitoringStockCard = memo(function MonitoringStockCard({ stock, realtimePrice, isSelected, onClick }: MonitoringStockCardProps) {
  // 일봉 데이터 가져오기
  const { candleData } = useDailyPrices(stock.stockCode);

  // 스파크라인용 종가 배열 (최근 30일)
  const closePrices = useMemo(() => {
    if (candleData.length === 0) return [];
    return candleData.slice(-30).map((d) => d.close);
  }, [candleData]);

  // 가격 정보
  const priceInfo = useMemo(() => {
    if (!realtimePrice) {
      return {
        price: "-",
        change: "-",
        changeRate: "-",
        changeSign: "flat" as const,
      };
    }

    return {
      price: realtimePrice.price.toLocaleString(),
      change: realtimePrice.change > 0 ? `+${realtimePrice.change.toLocaleString()}` : realtimePrice.change.toLocaleString(),
      changeRate: realtimePrice.changeRate > 0 ? `+${realtimePrice.changeRate.toFixed(2)}%` : `${realtimePrice.changeRate.toFixed(2)}%`,
      changeSign: realtimePrice.changeSign,
    };
  }, [realtimePrice]);

  // 등락 색상
  const changeColorClass = useMemo(() => {
    switch (priceInfo.changeSign) {
      case "rise":
        return "text-light-danger-50";
      case "fall":
        return "text-light-information-50";
      default:
        return "text-light-gray-50";
    }
  }, [priceInfo.changeSign]);

  // 시가총액 포맷
  const formattedMarketCap = useMemo(() => {
    if (stock.marketCap >= 1_000_000_000_000) {
      return `${(stock.marketCap / 1_000_000_000_000).toFixed(1)}조`;
    }
    if (stock.marketCap >= 100_000_000) {
      return `${(stock.marketCap / 100_000_000).toFixed(0)}억`;
    }
    return `${stock.marketCap.toLocaleString()}`;
  }, [stock.marketCap]);

  return (
    <div
      onClick={onClick}
      className={`
        p-4 rounded-lg border cursor-pointer transition-all
        ${isSelected ? "border-light-primary-50 bg-light-primary-5 shadow-md" : "border-light-gray-20 bg-light-gray-0 hover:border-light-gray-30 hover:shadow-sm"}
      `}
    >
      {/* 헤더: 종목명 + 실시간 표시 */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-light-gray-90 text-sm truncate">{stock.corpName}</h3>
        {realtimePrice && <span className="w-2 h-2 rounded-full bg-light-success-50 animate-pulse" title="실시간" />}
      </div>

      {/* 가격 정보 */}
      <div className="mb-3">
        <div className="text-lg font-bold text-light-gray-90">{priceInfo.price}</div>
        <div className={`text-sm font-medium ${changeColorClass}`}>{priceInfo.changeRate}</div>
      </div>

      {/* 미니 스파크라인 차트 */}
      <div className="h-10 mb-3">
        {closePrices.length > 0 ? (
          <SparklineChart prices={closePrices} height={40} />
        ) : (
          <div className="h-full bg-light-gray-5 rounded flex items-center justify-center">
            <span className="text-xs text-light-gray-30">-</span>
          </div>
        )}
      </div>

      {/* 기술지표 뱃지 영역 */}
      <div className="flex flex-wrap gap-1">
        {/* TODO: 실제 기술지표 계산 후 뱃지 표시 */}
        <span className="text-xs px-1.5 py-0.5 rounded bg-light-gray-10 text-light-gray-50">ROE {stock.roe.toFixed(1)}%</span>
      </div>

      {/* 시가총액 */}
      <div className="mt-2 text-xs text-light-gray-40">{formattedMarketCap}</div>
    </div>
  );
});
