"use client";

import ReactECharts from "echarts-for-react";
import { useMemo } from "react";

/**
 * 일봉 캔들 데이터 타입
 */
export interface CandleData {
  date: string; // YYYYMMDD
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * 실시간 가격 데이터 타입
 */
export interface RealtimeData {
  timestamp: string;
  price: number;
}

interface StockPriceChartProps {
  /** 과거 일봉 데이터 (캔들) */
  candleData: CandleData[];
  /** 당일 실시간 데이터 (라인) */
  realtimeData: RealtimeData[];
}

/**
 * YYYYMMDD 형식을 표시용 문자열로 변환
 */
function formatDate(dateStr: string): string {
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${year}-${month}-${day}`;
}

/**
 * 주가 차트 컴포넌트 (캔들스틱 + 실시간 라인)
 */
export function StockPriceChart({ candleData, realtimeData }: StockPriceChartProps) {
  const option = useMemo(() => {
    // 캔들 데이터 변환: [open, close, low, high]
    const candleDates = candleData.map((d) => formatDate(d.date));
    const candleValues = candleData.map((d) => [d.open, d.close, d.low, d.high]);

    // 실시간 데이터 변환
    const realtimeDates = realtimeData.map((d) =>
      new Date(d.timestamp).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
    const realtimeValues = realtimeData.map((d) => d.price);

    // 캔들 데이터만 있는 경우
    if (candleData.length > 0 && realtimeData.length === 0) {
      return {
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "cross" },
        },
        grid: {
          left: "3%",
          right: "3%",
          top: "8%",
          bottom: "12%",
          containLabel: true,
        },
        xAxis: {
          type: "category",
          data: candleDates,
          axisLine: { lineStyle: { color: "#e5e7eb" } },
          axisLabel: { color: "#6b7280" },
        },
        yAxis: {
          type: "value",
          scale: true,
          axisLine: { lineStyle: { color: "#e5e7eb" } },
          axisLabel: { color: "#6b7280" },
          splitLine: { lineStyle: { color: "#f3f4f6" } },
        },
        series: [
          {
            name: "일봉",
            type: "candlestick",
            data: candleValues,
            itemStyle: {
              color: "#ef4444", // 상승 (빨강)
              color0: "#3b82f6", // 하락 (파랑)
              borderColor: "#ef4444",
              borderColor0: "#3b82f6",
            },
          },
        ],
      };
    }

    // 실시간 데이터만 있는 경우
    if (realtimeData.length > 0 && candleData.length === 0) {
      return {
        tooltip: {
          trigger: "axis",
          formatter: (params: { value: number; axisValue: string }[]) => {
            const param = params[0];
            return `${param.axisValue}<br/>가격: ${param.value.toLocaleString()}원`;
          },
        },
        grid: {
          left: "3%",
          right: "3%",
          top: "8%",
          bottom: "12%",
          containLabel: true,
        },
        xAxis: {
          type: "category",
          data: realtimeDates,
          axisLine: { lineStyle: { color: "#e5e7eb" } },
          axisLabel: { color: "#6b7280", rotate: 45 },
        },
        yAxis: {
          type: "value",
          scale: true,
          axisLine: { lineStyle: { color: "#e5e7eb" } },
          axisLabel: {
            color: "#6b7280",
            formatter: (value: number) => value.toLocaleString(),
          },
          splitLine: { lineStyle: { color: "#f3f4f6" } },
        },
        series: [
          {
            name: "현재가",
            type: "line",
            data: realtimeValues,
            smooth: true,
            symbol: "none",
            lineStyle: { color: "#10b981", width: 2 },
            areaStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: "rgba(16, 185, 129, 0.3)" },
                  { offset: 1, color: "rgba(16, 185, 129, 0.05)" },
                ],
              },
            },
          },
        ],
      };
    }

    // 둘 다 있는 경우 (복합 차트) - 향후 구현
    // 현재는 실시간 데이터 우선 표시
    if (realtimeData.length > 0) {
      return {
        tooltip: {
          trigger: "axis",
          formatter: (params: { value: number; axisValue: string }[]) => {
            const param = params[0];
            return `${param.axisValue}<br/>가격: ${param.value.toLocaleString()}원`;
          },
        },
        grid: {
          left: "3%",
          right: "3%",
          top: "8%",
          bottom: "12%",
          containLabel: true,
        },
        xAxis: {
          type: "category",
          data: realtimeDates,
          axisLine: { lineStyle: { color: "#e5e7eb" } },
          axisLabel: { color: "#6b7280", rotate: 45 },
        },
        yAxis: {
          type: "value",
          scale: true,
          axisLine: { lineStyle: { color: "#e5e7eb" } },
          axisLabel: {
            color: "#6b7280",
            formatter: (value: number) => value.toLocaleString(),
          },
          splitLine: { lineStyle: { color: "#f3f4f6" } },
        },
        series: [
          {
            name: "현재가",
            type: "line",
            data: realtimeValues,
            smooth: true,
            symbol: "none",
            lineStyle: { color: "#10b981", width: 2 },
            areaStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: "rgba(16, 185, 129, 0.3)" },
                  { offset: 1, color: "rgba(16, 185, 129, 0.05)" },
                ],
              },
            },
          },
        ],
      };
    }

    // 데이터 없음
    return {};
  }, [candleData, realtimeData]);

  const hasData = candleData.length > 0 || realtimeData.length > 0;

  if (!hasData) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-light-gray-40">데이터 대기 중...</p>
      </div>
    );
  }

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />;
}
