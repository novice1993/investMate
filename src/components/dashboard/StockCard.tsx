"use client";

import { memo } from "react";
import type { RealtimePrice } from "@/core/entities/stock-price.entity";
import type { ScreenedStock } from "@/hooks/useScreenedStocks";
import type { SignalTriggers } from "@/hooks/useSignalAlert";
import { MiniChart } from "./MiniChart";
import { PriceDisplay } from "./PriceDisplay";
import { SignalBadges } from "./SignalBadges";

// ============================================================================
// Types
// ============================================================================

interface StockCardProps {
  stock: ScreenedStock;
  realtimePrice?: RealtimePrice;
  signal?: SignalTriggers;
  isSelected: boolean;
  onClick: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const StockCard = memo(function StockCard({ stock, realtimePrice, signal, isSelected, onClick }: StockCardProps) {
  // 활성 시그널 여부
  const hasSignal = signal && (signal.rsiOversold || signal.goldenCross || signal.volumeSpike);

  return (
    <article
      onClick={onClick}
      className={`
        relative p-5 rounded-xl cursor-pointer
        transition-all duration-200 ease-out
        hover:scale-[1.01] hover:shadow-lg
        ${isSelected ? "bg-light-primary-5 border-2 border-light-primary-50 shadow-lg" : "bg-light-gray-0 border border-light-gray-20 hover:border-light-gray-30"}
      `}
    >
      {/* 실시간 표시 */}
      {realtimePrice && <LiveIndicator />}

      {/* 헤더: 종목명 + 코드 */}
      <CardHeader corpName={stock.corpName} stockCode={stock.stockCode} />

      {/* 가격 정보 */}
      <PriceDisplay realtimePrice={realtimePrice} />

      {/* 미니 차트 */}
      <div className="h-24 mb-4">
        <MiniChart stockCode={stock.stockCode} />
      </div>

      {/* 하단: 시그널 뱃지 또는 ROE */}
      <CardFooter signal={signal} hasSignal={hasSignal} roe={stock.roe} />
    </article>
  );
});

// ============================================================================
// Sub Components
// ============================================================================

function LiveIndicator() {
  return (
    <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-light-success-50" title="실시간">
      <span className="absolute inset-0 rounded-full bg-light-success-50 animate-ping opacity-75" />
    </span>
  );
}

interface CardHeaderProps {
  corpName: string;
  stockCode: string;
}

function CardHeader({ corpName, stockCode }: CardHeaderProps) {
  return (
    <header className="mb-3 pr-4">
      <h3 className="font-semibold text-light-gray-90 text-base truncate">{corpName}</h3>
      <p className="text-xs text-light-gray-40">{stockCode}</p>
    </header>
  );
}

interface CardFooterProps {
  signal?: SignalTriggers;
  hasSignal?: boolean;
  roe: number;
}

function CardFooter({ signal, hasSignal, roe }: CardFooterProps) {
  if (hasSignal && signal) {
    return <SignalBadges signal={signal} />;
  }

  return (
    <div className="text-xs text-light-gray-50">
      ROE <span className="font-medium text-light-gray-70">{roe.toFixed(1)}%</span>
    </div>
  );
}
