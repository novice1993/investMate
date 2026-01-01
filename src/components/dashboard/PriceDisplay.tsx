"use client";

import { useMemo } from "react";
import { useDailyPrices } from "@/components/stockChart";
import type { RealtimePrice } from "@/core/entities/stock-price.entity";
import { isMarketOpen } from "@/core/services/market-hours.service";

// ============================================================================
// Types
// ============================================================================

interface PriceDisplayProps {
  stockCode: string;
  realtimePrice?: RealtimePrice;
}

// ============================================================================
// Component
// ============================================================================

export function PriceDisplay({ stockCode, realtimePrice }: PriceDisplayProps) {
  const { candleData } = useDailyPrices(stockCode);

  // 개장 여부
  const marketOpen = useMemo(() => isMarketOpen(), []);

  // 마지막 일봉 종가 (폐장 시 사용)
  const lastDailyPrice = useMemo(() => {
    if (candleData.length === 0) return null;
    const lastCandle = candleData[candleData.length - 1];
    const prevCandle = candleData.length > 1 ? candleData[candleData.length - 2] : null;

    const change = prevCandle ? lastCandle.close - prevCandle.close : 0;
    const changeRate = prevCandle && prevCandle.close > 0 ? (change / prevCandle.close) * 100 : 0;

    return {
      price: lastCandle.close,
      change,
      changeRate,
      changeSign: change > 0 ? ("rise" as const) : change < 0 ? ("fall" as const) : ("flat" as const),
    };
  }, [candleData]);

  // 표시할 가격 데이터 결정: 실시간 > 일봉 종가
  const priceData = realtimePrice
    ? {
        price: realtimePrice.price,
        change: realtimePrice.change,
        changeRate: realtimePrice.changeRate,
        changeSign: realtimePrice.changeSign,
      }
    : lastDailyPrice;

  // 데이터 없음
  if (!priceData) {
    return (
      <div className="mb-3">
        <p className="text-lg font-bold text-light-gray-30">-</p>
        <p className="text-xs text-light-gray-30">데이터 없음</p>
      </div>
    );
  }

  const { price, change, changeRate, changeSign } = priceData;
  const colorClass = getColorClass(changeSign);
  const signPrefix = getSignPrefix(changeSign);

  // 폐장 시: 실시간이든 일봉이든 [종가]로 표시
  // 개장 시: 실시간 데이터만 표시 (Live)
  const isClosingPrice = !marketOpen;

  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5">
        <p className={`text-lg font-bold ${colorClass}`}>{price.toLocaleString()}원</p>
        {isClosingPrice && <span className="text-[10px] text-light-gray-50 bg-light-gray-10 px-1 py-0.5 rounded">[종가]</span>}
      </div>
      <p className={`text-xs ${colorClass}`}>
        {signPrefix}
        {Math.abs(change).toLocaleString()} ({signPrefix}
        {Math.abs(changeRate).toFixed(2)}%)
      </p>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getColorClass(changeSign: RealtimePrice["changeSign"]): string {
  switch (changeSign) {
    case "rise":
      return "text-light-danger-50";
    case "fall":
      return "text-light-information-50";
    default:
      return "text-light-gray-70";
  }
}

function getSignPrefix(changeSign: RealtimePrice["changeSign"]): string {
  switch (changeSign) {
    case "rise":
      return "+";
    case "fall":
      return "-";
    default:
      return "";
  }
}
