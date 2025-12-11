"use client";

import type { RealtimePrice } from "@/core/entities/stock-price.entity";

// ============================================================================
// Types
// ============================================================================

interface PriceDisplayProps {
  realtimePrice?: RealtimePrice;
}

// ============================================================================
// Component
// ============================================================================

export function PriceDisplay({ realtimePrice }: PriceDisplayProps) {
  if (!realtimePrice) {
    return (
      <div className="mb-3">
        <p className="text-lg font-bold text-light-gray-30">-</p>
        <p className="text-xs text-light-gray-30">데이터 없음</p>
      </div>
    );
  }

  const { price, change, changeRate, changeSign } = realtimePrice;

  const colorClass = getColorClass(changeSign);
  const signPrefix = getSignPrefix(changeSign);

  return (
    <div className="mb-3">
      <p className={`text-lg font-bold ${colorClass}`}>{price.toLocaleString()}원</p>
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
