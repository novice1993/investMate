"use client";

import { useMemo } from "react";
import { useDailyPrices } from "@/components/stock-chart/useDailyPrices";

// ============================================================================
// Types
// ============================================================================

interface MiniChartProps {
  stockCode: string;
}

type Trend = "rise" | "fall" | "flat";

interface ChartData {
  prices: number[];
  trend: Trend;
  pathData: string;
  areaData: string;
}

// ============================================================================
// Constants
// ============================================================================

const CHART_CONFIG = {
  width: 100,
  height: 48,
  padding: 4,
  strokeWidth: 2,
} as const;

const TREND_COLORS: Record<Trend, { stroke: string; gradientId: string }> = {
  rise: { stroke: "#de3412", gradientId: "gradient-rise" },
  fall: { stroke: "#0b78cb", gradientId: "gradient-fall" },
  flat: { stroke: "#6b7280", gradientId: "gradient-flat" },
};

// ============================================================================
// Component
// ============================================================================

export function MiniChart({ stockCode }: MiniChartProps) {
  const { candleData, isLoading } = useDailyPrices(stockCode);

  const chartData = useMemo<ChartData | null>(() => {
    if (candleData.length < 2) return null;

    const prices = candleData.slice(-20).map((d) => d.close);
    const trend = calculateTrend(prices);
    const { pathData, areaData } = generatePaths(prices);

    return { prices, trend, pathData, areaData };
  }, [candleData]);

  // 로딩 상태
  if (isLoading) {
    return <ChartSkeleton />;
  }

  // 데이터 없음
  if (!chartData) {
    return <ChartEmpty />;
  }

  const colors = TREND_COLORS[chartData.trend];

  return (
    <div className="w-full h-full group relative">
      <svg viewBox={`0 0 ${CHART_CONFIG.width} ${CHART_CONFIG.height}`} className="w-full h-full" preserveAspectRatio="none">
        {/* 그라데이션 정의 */}
        <defs>
          <linearGradient id={colors.gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.stroke} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.stroke} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* 영역 채움 */}
        <path d={chartData.areaData} fill={`url(#${colors.gradientId})`} className="transition-opacity duration-200" />

        {/* 라인 */}
        <path d={chartData.pathData} fill="none" stroke={colors.stroke} strokeWidth={CHART_CONFIG.strokeWidth} strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-200" />

        {/* 마지막 점 (호버 시 강조) */}
        <LastPoint prices={chartData.prices} stroke={colors.stroke} />
      </svg>
    </div>
  );
}

// ============================================================================
// Sub Components
// ============================================================================

function ChartSkeleton() {
  return <div className="w-full h-full bg-light-gray-5 rounded animate-pulse" />;
}

function ChartEmpty() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-light-gray-5 rounded">
      <span className="text-xs text-light-gray-30">-</span>
    </div>
  );
}

interface LastPointProps {
  prices: number[];
  stroke: string;
}

function LastPoint({ prices, stroke }: LastPointProps) {
  const { x, y } = useMemo(() => {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const lastPrice = prices[prices.length - 1];
    const x = CHART_CONFIG.width - CHART_CONFIG.padding;
    const y = CHART_CONFIG.height - CHART_CONFIG.padding - ((lastPrice - min) / range) * (CHART_CONFIG.height - CHART_CONFIG.padding * 2);

    return { x, y };
  }, [prices]);

  return (
    <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      {/* 외곽 원 */}
      <circle cx={x} cy={y} r="4" fill="white" stroke={stroke} strokeWidth="2" />
      {/* 내부 점 */}
      <circle cx={x} cy={y} r="2" fill={stroke} />
    </g>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function calculateTrend(prices: number[]): Trend {
  if (prices.length < 2) return "flat";

  const first = prices[0];
  const last = prices[prices.length - 1];

  if (last > first) return "rise";
  if (last < first) return "fall";
  return "flat";
}

function generatePaths(prices: number[]): { pathData: string; areaData: string } {
  const { width, height, padding } = CHART_CONFIG;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const points = prices.map((price, i) => {
    const x = (i / (prices.length - 1)) * (width - padding * 2) + padding;
    const y = height - padding - ((price - min) / range) * (height - padding * 2);
    return { x, y };
  });

  // 라인 경로
  const pathData = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");

  // 영역 경로 (라인 + 하단 닫기)
  const areaData = `${pathData} L ${points[points.length - 1].x},${height - padding} L ${padding},${height - padding} Z`;

  return { pathData, areaData };
}
