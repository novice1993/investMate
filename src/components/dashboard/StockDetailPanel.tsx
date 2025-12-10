"use client";

import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { MetricsSkeleton } from "@/components/skeletons";
import { StockChartCard } from "@/components/stockChart";
import type { RealtimePrice } from "@/core/entities/stock-price.entity";
import type { ScreenedStock } from "@/hooks/useScreenedStocks";
import type { SignalTriggers } from "@/hooks/useSignalAlert";
import { FinancialMetricsContent } from "./FinancialMetricsContent";

// ============================================================================
// Types
// ============================================================================

interface StockDetailPanelProps {
  stock: ScreenedStock;
  realtimePrice?: RealtimePrice;
  signal?: SignalTriggers;
  /** 검색으로 선택한 종목 여부 (실시간 데이터 미지원) */
  isSearchedStock?: boolean;
  onClose: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function StockDetailPanel({ stock, realtimePrice, signal, isSearchedStock = false, onClose }: StockDetailPanelProps) {
  const { reset } = useQueryErrorResetBoundary();

  // 가격 정보
  const priceInfo = useMemo(() => {
    if (!realtimePrice) {
      return { price: "-", change: "-", changeRate: "-", changeSign: "flat" as const };
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

  return (
    <div className="bg-light-gray-0 rounded-xl border border-light-gray-20 p-4 sticky top-16">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-light-gray-90">{stock.corpName}</h2>
            {isSearchedStock && <span className="px-2 py-0.5 text-xs font-medium bg-light-gray-20 text-light-gray-60 rounded">검색 종목</span>}
          </div>
          <p className="text-sm text-light-gray-50">{stock.stockCode}</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-light-gray-5 transition-colors" aria-label="닫기">
          <svg className="w-5 h-5 text-light-gray-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 가격 정보 */}
      <div className="mb-4 p-3 bg-light-gray-5 rounded-lg">
        {isSearchedStock ? (
          <div className="text-sm text-light-gray-50">실시간 시세 미지원 종목입니다</div>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-light-gray-90">{priceInfo.price}</span>
              <span className={`text-lg font-semibold ${changeColorClass}`}>{priceInfo.changeRate}</span>
              {realtimePrice && <span className="w-2 h-2 rounded-full bg-light-success-50 animate-pulse" />}
            </div>
            <div className={`text-sm ${changeColorClass}`}>{priceInfo.change}</div>
          </>
        )}
      </div>

      {/* 시그널 상태 (선별 종목만) */}
      {!isSearchedStock && signal && (signal.rsiOversold || signal.goldenCross || signal.volumeSpike) && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-light-gray-70 mb-2">활성 시그널</h3>
          <div className="flex gap-2 flex-wrap">
            {signal.rsiOversold && <SignalBadge label="RSI 과매도" color="bg-light-danger-50" />}
            {signal.goldenCross && <SignalBadge label="골든크로스" color="bg-light-success-50" />}
            {signal.volumeSpike && <SignalBadge label="거래량 급등" color="bg-light-warning-50" textColor="text-light-gray-90" />}
          </div>
        </div>
      )}

      {/* 차트 */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-light-gray-70 mb-2">주가 차트</h3>
        <div className="h-[250px] border border-light-gray-10 rounded-lg overflow-hidden">
          <StockChartCard stockCode={stock.stockCode} enableRealtime={!isSearchedStock} />
        </div>
      </div>

      {/* 펀더멘털 지표 */}
      <div>
        <h3 className="text-sm font-semibold text-light-gray-70 mb-2">펀더멘털 지표</h3>
        {isSearchedStock ? (
          // 검색 종목: API 호출 필요 → Suspense/ErrorBoundary 적용
          <ErrorBoundary resetKeys={[stock.stockCode]} onReset={reset} fallbackRender={({ resetErrorBoundary }) => <MetricsErrorFallback onRetry={resetErrorBoundary} />}>
            <Suspense fallback={<MetricsSkeleton />}>
              <FinancialMetricsContent stockCode={stock.stockCode} />
            </Suspense>
          </ErrorBoundary>
        ) : (
          // 선별 종목: 이미 데이터 보유 → 즉시 렌더링
          <div className="grid grid-cols-3 gap-2">
            <MetricCard label="ROE" value={`${stock.roe.toFixed(1)}%`} />
            <MetricCard label="부채비율" value={`${stock.debtRatio.toFixed(1)}%`} />
            <MetricCard label="영업이익률" value={`${stock.operatingMargin.toFixed(1)}%`} />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Sub Components
// ============================================================================

interface SignalBadgeProps {
  label: string;
  color: string;
  textColor?: string;
}

function SignalBadge({ label, color, textColor = "text-light-gray-0" }: SignalBadgeProps) {
  return <span className={`px-3 py-1 rounded-full text-sm font-medium ${color} ${textColor}`}>{label}</span>;
}

interface MetricCardProps {
  label: string;
  value: string;
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="p-3 bg-light-gray-5 rounded-lg text-center">
      <div className="text-xs text-light-gray-50 mb-1">{label}</div>
      <div className="text-sm font-semibold text-light-gray-90">{value}</div>
    </div>
  );
}

function MetricsErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-4 bg-light-danger-5 border border-light-danger-20 rounded-lg text-center">
      <p className="text-sm text-light-danger-60 mb-2">재무지표를 불러올 수 없습니다</p>
      <button onClick={onRetry} className="px-3 py-1.5 text-xs font-medium text-light-danger-50 bg-light-gray-0 border border-light-danger-30 rounded-lg hover:bg-light-danger-5 transition-colors">
        다시 시도
      </button>
    </div>
  );
}
