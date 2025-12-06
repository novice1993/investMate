"use client";

import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import { colorTokens } from "@/styles/tokens";

// ============================================================================
// Types
// ============================================================================

interface SparklineChartProps {
  /** 종가 배열 (오래된 순) */
  prices: number[];
  /** 차트 높이 (default: 40) */
  height?: number;
}

// ============================================================================
// Component
// ============================================================================

/**
 * 미니 스파크라인 차트
 * - 종가 추이를 간단한 라인으로 표시
 * - 상승/하락에 따라 색상 변경
 */
export function SparklineChart({ prices, height = 40 }: SparklineChartProps) {
  const option = useMemo(() => {
    if (prices.length < 2) {
      return null;
    }

    // 상승/하락 판단 (첫 값 vs 마지막 값)
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const isUp = lastPrice >= firstPrice;

    const lineColor = isUp ? colorTokens["light-danger-50"] : colorTokens["light-information-50"];
    const areaColorStart = isUp ? `${colorTokens["light-danger-50"]}30` : `${colorTokens["light-information-50"]}30`;
    const areaColorEnd = isUp ? `${colorTokens["light-danger-50"]}05` : `${colorTokens["light-information-50"]}05`;

    return {
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
      },
      series: [
        {
          type: "line",
          data: prices,
          smooth: 0.3,
          symbol: "none",
          lineStyle: {
            width: 1.5,
            color: lineColor,
          },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: areaColorStart },
                { offset: 1, color: areaColorEnd },
              ],
            },
          },
        },
      ],
    };
  }, [prices]);

  if (!option) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-xs text-light-gray-30">-</span>
      </div>
    );
  }

  return <ReactECharts option={option} style={{ height, width: "100%" }} opts={{ renderer: "svg" }} />;
}
