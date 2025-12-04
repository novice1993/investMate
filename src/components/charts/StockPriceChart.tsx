"use client";

import ReactECharts from "echarts-for-react";
import type { EChartsInstance } from "echarts-for-react";
import { useMemo, useRef, useCallback } from "react";
import { colorTokens } from "@/styles/tokens";

// 디자인 토큰 기반 차트 색상
const chartColors = {
  rise: colorTokens["light-danger-50"], // 상승 (빨강)
  fall: colorTokens["light-information-50"], // 하락 (파랑)
  axisLine: colorTokens["light-gray-20"], // 축 라인
  axisLabel: colorTokens["light-gray-50"], // 축 라벨
  splitLine: colorTokens["light-gray-10"], // 분할선
  border: colorTokens["light-gray-0"], // 테두리 (흰색)
  neutral: colorTokens["light-gray-40"], // 중립
  line: colorTokens["light-success-50"], // 실시간 라인
  priceLine: colorTokens["light-primary-40"], // 종가 연결 라인
  volumeLine: colorTokens["light-gray-50"], // 거래량 연결 라인
};

/**
 * 일봉 캔들 데이터 타입
 */
export interface CandleData {
  date: string; // YYYYMMDD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * 실시간 가격 데이터 타입
 */
export interface RealtimeData {
  timestamp: string;
  price: number;
  volume: number;
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
 * 숫자를 축약형으로 변환 (1000000 → 1M)
 */
function formatVolume(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + "M";
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(0) + "K";
  }
  return value.toString();
}

/**
 * 주가 차트 컴포넌트 (캔들스틱 + 거래량 + 실시간 점)
 */
export function StockPriceChart({ candleData, realtimeData }: StockPriceChartProps) {
  const chartRef = useRef<EChartsInstance | null>(null);
  const zoomStateRef = useRef<{ start: number; end: number }>({ start: 70, end: 100 });

  // 차트 인스턴스 저장 및 줌 이벤트 핸들러 등록
  const onChartReady = useCallback((instance: EChartsInstance) => {
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
  }, []);

  const option = useMemo(() => {
    // 캔들 데이터 변환: [open, close, low, high]
    const candleDates = candleData.map((d) => formatDate(d.date));
    const candleValues = candleData.map((d) => [d.open, d.close, d.low, d.high]);
    const volumeValues = candleData.map((d) => d.volume);

    // 거래량 색상 (상승: 빨강, 하락: 파랑)
    const volumeColors = candleData.map((d) => (d.close >= d.open ? chartColors.rise : chartColors.fall));

    // 실시간 최신 데이터 (마지막 값만 사용)
    const latestRealtime = realtimeData.length > 0 ? realtimeData[realtimeData.length - 1] : null;
    const latestRealtimePrice = latestRealtime?.price ?? null;
    const latestRealtimeVolume = latestRealtime?.volume ?? null;

    // 캔들 데이터가 있는 경우 (실시간 유무와 관계없이)
    if (candleData.length > 0) {
      // x축 데이터: 일봉 날짜 + "실시간" (실시간 데이터가 있을 때만)
      const xAxisData = latestRealtimePrice !== null ? [...candleDates, "실시간"] : candleDates;

      // 캔들스틱 데이터: 실시간이 있으면 마지막에 빈 값 추가 (캔들 영역 유지)
      const candleSeriesData = latestRealtimePrice !== null ? [...candleValues, ["-", "-", "-", "-"]] : candleValues;

      // 전일 종가 (캔들 마지막 데이터의 close)
      const prevClose = candleData.length > 0 ? candleData[candleData.length - 1].close : null;

      // 등락 여부 판단 (상승: 빨강, 하락: 파랑)
      const isUp = prevClose !== null && latestRealtimePrice !== null ? latestRealtimePrice >= prevClose : true;
      const realtimeColor = isUp ? chartColors.rise : chartColors.fall;

      // 거래량 데이터: 실시간이 있으면 마지막에 실시간 누적 거래량 추가
      const volumeSeriesData = latestRealtimeVolume !== null ? [...volumeValues, latestRealtimeVolume] : volumeValues;
      const volumeColorData = latestRealtimeVolume !== null ? [...volumeColors, realtimeColor] : volumeColors;

      // 실시간 점 데이터: 캔들 영역은 빈 값, 마지막에 현재가
      const realtimeSeriesData = latestRealtimePrice !== null ? [...candleData.map(() => null), latestRealtimePrice] : [];

      // 종가 라인 데이터: 캔들 종가들 + 실시간 현재가
      const closePrices = candleData.map((d) => d.close);
      const priceLineData = latestRealtimePrice !== null ? [...closePrices, latestRealtimePrice] : closePrices;

      const series: object[] = [
        {
          name: "일봉",
          type: "candlestick",
          data: candleSeriesData,
          xAxisIndex: 0,
          yAxisIndex: 0,
          itemStyle: {
            color: chartColors.rise,
            color0: chartColors.fall,
            borderColor: chartColors.rise,
            borderColor0: chartColors.fall,
          },
        },
        {
          name: "종가",
          type: "line",
          data: priceLineData,
          xAxisIndex: 0,
          yAxisIndex: 0,
          smooth: 0.3,
          symbol: "none",
          lineStyle: {
            width: 2,
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: `${chartColors.priceLine}40` }, // 시작: 연하게
                { offset: 0.7, color: `${chartColors.priceLine}AA` }, // 중간
                { offset: 1, color: chartColors.priceLine }, // 끝: 진하게
              ],
            },
            shadowColor: `${chartColors.priceLine}60`,
            shadowBlur: 6,
            shadowOffsetY: 3,
          },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${chartColors.priceLine}25` },
                { offset: 1, color: `${chartColors.priceLine}05` },
              ],
            },
          },
          z: 5,
        },
        {
          name: "거래량",
          type: "bar",
          data: volumeSeriesData.map((v, i) => ({
            value: v,
            itemStyle: { color: volumeColorData[i] },
          })),
          xAxisIndex: 1,
          yAxisIndex: 1,
        },
        {
          name: "거래량 추이",
          type: "line",
          data: volumeSeriesData,
          xAxisIndex: 1,
          yAxisIndex: 1,
          smooth: true,
          symbol: "none",
          lineStyle: {
            color: chartColors.volumeLine,
            width: 1,
            opacity: 0.6,
          },
          z: 5,
        },
      ];

      // 실시간 데이터가 있으면 점 시리즈 추가
      if (latestRealtimePrice !== null) {
        series.push({
          name: "현재가",
          type: "scatter",
          data: realtimeSeriesData,
          xAxisIndex: 0,
          yAxisIndex: 0,
          symbol: "circle",
          symbolSize: 12,
          itemStyle: {
            color: realtimeColor,
            borderColor: chartColors.border,
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
        grid: [
          {
            // 캔들차트 영역 (상단 70%)
            left: "3%",
            right: "3%",
            top: "5%",
            height: "60%",
            containLabel: true,
          },
          {
            // 거래량 영역 (하단 25%)
            left: "3%",
            right: "3%",
            top: "72%",
            height: "20%",
            containLabel: true,
          },
        ],
        xAxis: [
          {
            type: "category",
            data: xAxisData,
            gridIndex: 0,
            axisLine: { lineStyle: { color: chartColors.axisLine } },
            axisLabel: { show: false }, // 상단 차트는 라벨 숨김
          },
          {
            type: "category",
            data: xAxisData,
            gridIndex: 1,
            axisLine: { lineStyle: { color: chartColors.axisLine } },
            axisLabel: { color: chartColors.axisLabel, fontSize: 10 },
          },
        ],
        yAxis: [
          {
            type: "value",
            scale: true,
            gridIndex: 0,
            axisLine: { lineStyle: { color: chartColors.axisLine } },
            axisLabel: {
              color: chartColors.axisLabel,
              formatter: (value: number) => value.toLocaleString(),
            },
            splitLine: { lineStyle: { color: chartColors.splitLine } },
          },
          {
            type: "value",
            scale: true,
            gridIndex: 1,
            axisLine: { lineStyle: { color: chartColors.axisLine } },
            axisLabel: {
              color: chartColors.axisLabel,
              fontSize: 10,
              formatter: (value: number) => formatVolume(value),
            },
            splitLine: { lineStyle: { color: chartColors.splitLine } },
          },
        ],
        dataZoom: [
          {
            type: "inside",
            xAxisIndex: [0, 1], // 두 x축 동시 줌
            start: zoomStateRef.current.start,
            end: zoomStateRef.current.end,
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
          axisLine: { lineStyle: { color: chartColors.axisLine } },
          axisLabel: { color: chartColors.axisLabel, rotate: 45 },
        },
        yAxis: {
          type: "value",
          scale: true,
          axisLine: { lineStyle: { color: chartColors.axisLine } },
          axisLabel: {
            color: chartColors.axisLabel,
            formatter: (value: number) => value.toLocaleString(),
          },
          splitLine: { lineStyle: { color: chartColors.splitLine } },
        },
        series: [
          {
            name: "현재가",
            type: "line",
            data: realtimeValues,
            smooth: true,
            symbol: "none",
            lineStyle: { color: chartColors.line, width: 2 },
            areaStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: `${chartColors.line}4D` }, // 30% opacity
                  { offset: 1, color: `${chartColors.line}0D` }, // 5% opacity
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
