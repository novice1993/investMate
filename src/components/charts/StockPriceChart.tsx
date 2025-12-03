"use client";

import ReactECharts from "echarts-for-react";
import type { EChartsInstance } from "echarts-for-react";
import { useMemo, useRef, useCallback } from "react";

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
  /** 당일 실시간 데이터 (현재가) */
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
 * 주가 차트 컴포넌트 (캔들스틱 + 실시간 점)
 */
export function StockPriceChart({ candleData, realtimeData }: StockPriceChartProps) {
  const chartRef = useRef<EChartsInstance | null>(null);
  const zoomStateRef = useRef<{ start: number; end: number } | null>(null);
  const isInitializedRef = useRef(false);

  // 차트 인스턴스 저장 및 줌 이벤트 핸들러 등록
  const onChartReady = useCallback(
    (instance: EChartsInstance) => {
      chartRef.current = instance;

      // dataZoom 이벤트 리스너 등록 (줌 상태 저장)
      instance.on("datazoom", () => {
        const option = instance.getOption() as { dataZoom?: { start?: number; end?: number }[] };
        if (option.dataZoom && option.dataZoom[0]) {
          zoomStateRef.current = {
            start: option.dataZoom[0].start ?? 0,
            end: option.dataZoom[0].end ?? 100,
          };
        }
      });

      // 최초 로드 시 기본 줌 설정 (최근 30%)
      if (!isInitializedRef.current && candleData.length > 0) {
        isInitializedRef.current = true;
        zoomStateRef.current = { start: 70, end: 100 };
        instance.dispatchAction({
          type: "dataZoom",
          start: 70,
          end: 100,
        });
      }
    },
    [candleData.length]
  );

  const option = useMemo(() => {
    // 캔들 데이터 변환: [open, close, low, high]
    const candleDates = candleData.map((d) => formatDate(d.date));
    const candleValues = candleData.map((d) => [d.open, d.close, d.low, d.high]);

    // 실시간 최신 가격 (마지막 값만 사용)
    const latestRealtimePrice = realtimeData.length > 0 ? realtimeData[realtimeData.length - 1].price : null;

    // 캔들 데이터가 있는 경우 (실시간 유무와 관계없이)
    if (candleData.length > 0) {
      // x축 데이터: 일봉 날짜 + "실시간" (실시간 데이터가 있을 때만)
      const xAxisData = latestRealtimePrice !== null ? [...candleDates, "실시간"] : candleDates;

      // 캔들스틱 데이터: 실시간이 있으면 마지막에 빈 값 추가 (캔들 영역 유지)
      const candleSeriesData = latestRealtimePrice !== null ? [...candleValues, ["-", "-", "-", "-"]] : candleValues;

      // 실시간 점 데이터: 캔들 영역은 빈 값, 마지막에 현재가
      const realtimeSeriesData = latestRealtimePrice !== null ? [...candleData.map(() => null), latestRealtimePrice] : [];

      // 전일 종가 (캔들 마지막 데이터의 close)
      const prevClose = candleData.length > 0 ? candleData[candleData.length - 1].close : null;

      // 등락 여부 판단 (상승: 빨강, 하락: 파랑)
      const isUp = prevClose !== null && latestRealtimePrice !== null ? latestRealtimePrice >= prevClose : true;
      const realtimeColor = isUp ? "#ef4444" : "#3b82f6";

      const series: object[] = [
        {
          name: "일봉",
          type: "candlestick",
          data: candleSeriesData,
          itemStyle: {
            color: "#ef4444", // 상승 (빨강)
            color0: "#3b82f6", // 하락 (파랑)
            borderColor: "#ef4444",
            borderColor0: "#3b82f6",
          },
        },
      ];

      // 실시간 데이터가 있으면 점 시리즈 추가
      if (latestRealtimePrice !== null) {
        series.push({
          name: "현재가",
          type: "scatter",
          data: realtimeSeriesData,
          symbol: "circle",
          symbolSize: 12,
          itemStyle: {
            color: realtimeColor,
            borderColor: "#fff",
            borderWidth: 2,
          },
          z: 10,
        });
      }

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
          data: xAxisData,
          axisLine: { lineStyle: { color: "#e5e7eb" } },
          axisLabel: { color: "#6b7280" },
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
        dataZoom: [
          {
            type: "inside", // 마우스 스크롤로 줌
            xAxisIndex: 0,
            zoomOnMouseWheel: true,
            moveOnMouseMove: true,
            moveOnMouseWheel: false,
          },
        ],
        series,
      };
    }

    // 실시간 데이터만 있는 경우 (캔들 없음)
    if (realtimeData.length > 0 && candleData.length === 0) {
      const realtimeDates = realtimeData.map((d) =>
        new Date(d.timestamp).toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      const realtimeValues = realtimeData.map((d) => d.price);

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

  return <ReactECharts option={option} onChartReady={onChartReady} notMerge={false} lazyUpdate={true} style={{ height: "100%", width: "100%" }} />;
}
