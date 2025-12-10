"use client";

import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import { useDailyPrices } from "@/components/stock-chart/useDailyPrices";
import { colorTokens } from "@/styles/tokens";

// ============================================================================
// Types
// ============================================================================

interface MiniChartProps {
  stockCode: string;
}

type Trend = "rise" | "fall" | "flat";

// ============================================================================
// Constants
// ============================================================================

const CHART_COLORS = {
  rise: colorTokens["light-danger-50"],
  fall: colorTokens["light-information-50"],
  flat: colorTokens["light-gray-40"],
};

// ============================================================================
// Component
// ============================================================================

export function MiniChart({ stockCode }: MiniChartProps) {
  const { candleData, isLoading, error } = useDailyPrices(stockCode);

  const { option, trend } = useMemo(() => {
    if (candleData.length < 2) {
      return { option: null, trend: "flat" as Trend };
    }

    const prices = candleData.slice(-20).map((d) => d.close);
    const trend = calculateTrend(prices);
    const color = CHART_COLORS[trend];

    const option = {
      animation: true,
      animationDuration: 800,
      animationEasing: "cubicOut",
      grid: {
        left: 0,
        right: 0,
        top: 2,
        bottom: 2,
      },
      xAxis: {
        type: "category",
        show: false,
        data: prices.map((_, i) => i),
      },
      yAxis: {
        type: "value",
        show: false,
        scale: true,
        min: (value: { min: number }) => value.min * 0.998,
        max: (value: { max: number }) => value.max * 1.002,
      },
      series: [
        {
          type: "line",
          data: prices,
          smooth: 0.4,
          symbol: "none",
          lineStyle: {
            width: 2,
            color: color,
            shadowColor: `${color}40`,
            shadowBlur: 4,
            shadowOffsetY: 2,
          },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${color}30` },
                { offset: 0.5, color: `${color}15` },
                { offset: 1, color: `${color}05` },
              ],
            },
          },
          emphasis: {
            disabled: true,
          },
        },
      ],
      tooltip: {
        show: true,
        trigger: "axis",
        backgroundColor: colorTokens["light-gray-90"],
        borderColor: colorTokens["light-gray-70"],
        borderWidth: 1,
        padding: [4, 8],
        textStyle: {
          color: colorTokens["light-gray-0"],
          fontSize: 11,
        },
        formatter: (params: { value: number }[]) => {
          const value = params[0]?.value;
          if (value === undefined) return "";
          return `${value.toLocaleString()}원`;
        },
        axisPointer: {
          type: "line",
          lineStyle: {
            color: `${color}60`,
            width: 1,
            type: "dashed",
          },
        },
      },
    };

    return { option, trend };
  }, [candleData]);

  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (error) {
    return <ChartError />;
  }

  if (!option) {
    return <ChartEmpty />;
  }

  return (
    <div className="w-full h-full relative group">
      <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} notMerge={true} lazyUpdate={true} />
      {/* 트렌드 인디케이터 */}
      <TrendIndicator trend={trend} />
    </div>
  );
}

// ============================================================================
// Sub Components
// ============================================================================

function ChartSkeleton() {
  return (
    <div className="w-full h-full bg-light-gray-5 rounded overflow-hidden">
      <div className="h-full w-full animate-pulse bg-gradient-to-r from-light-gray-5 via-light-gray-10 to-light-gray-5 bg-[length:200%_100%] animate-shimmer" />
    </div>
  );
}

function ChartEmpty() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-light-gray-5 rounded">
      <span className="text-xs text-light-gray-30">-</span>
    </div>
  );
}

function ChartError() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-light-danger-5 rounded">
      <svg className="w-4 h-4 text-light-danger-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    </div>
  );
}

interface TrendIndicatorProps {
  trend: Trend;
}

function TrendIndicator({ trend }: TrendIndicatorProps) {
  if (trend === "flat") return null;

  const isRise = trend === "rise";
  const color = isRise ? "text-light-danger-50" : "text-light-information-50";
  const icon = isRise ? "▲" : "▼";

  return <span className={`absolute top-0 right-0 text-[10px] font-bold ${color} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>{icon}</span>;
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
