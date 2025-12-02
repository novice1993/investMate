"use client";

import ReactECharts from "echarts-for-react";
import { useMemo } from "react";

interface FinancialMetricData {
  year: string;
  quarter: number;
  roe: number;
  debt_ratio: number;
  operating_margin: number;
  net_margin: number;
  revenue_yoy: number;
  operating_profit_yoy: number;
  net_income_yoy: number;
}

interface FinancialMetricsChartProps {
  data: FinancialMetricData[];
}

/** 시리즈 설정 타입 */
interface SeriesConfig {
  key: keyof FinancialMetricData;
  label: string;
  color: string;
}

/** 차트 그룹 설정 */
interface ChartGroupConfig {
  title: string;
  series: SeriesConfig[];
}

const CHART_GROUPS: ChartGroupConfig[] = [
  {
    title: "수익성 지표",
    series: [
      { key: "roe", label: "ROE", color: "#3b82f6" },
      { key: "operating_margin", label: "영업이익률", color: "#10b981" },
      { key: "net_margin", label: "순이익률", color: "#f59e0b" },
    ],
  },
  {
    title: "안정성 지표",
    series: [{ key: "debt_ratio", label: "부채비율", color: "#ef4444" }],
  },
  {
    title: "성장성 지표 (YoY)",
    series: [
      { key: "revenue_yoy", label: "매출YoY", color: "#8b5cf6" },
      { key: "operating_profit_yoy", label: "영업이익YoY", color: "#ec4899" },
      { key: "net_income_yoy", label: "순이익YoY", color: "#06b6d4" },
    ],
  },
];

/**
 * 개별 차트 그룹 컴포넌트
 */
function MetricsChartGroup({ title, series, data }: ChartGroupConfig & { data: FinancialMetricData[] }) {
  const option = useMemo(() => {
    const xAxisData = data.map((d) => `${d.year} Q${d.quarter}`);

    const seriesData = series.map((s, index) => ({
      name: s.label,
      type: "line",
      data: data.map((d) => d[s.key]),
      smooth: true,
      symbol: "circle",
      symbolSize: 8,
      lineStyle: { color: s.color, width: 2.5 },
      itemStyle: { color: s.color, borderWidth: 2, borderColor: "#fff" },
      areaStyle:
        series.length === 1
          ? {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: s.color + "40" },
                  { offset: 1, color: s.color + "05" },
                ],
              },
            }
          : index === 0
            ? {
                color: {
                  type: "linear",
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: s.color + "20" },
                    { offset: 1, color: s.color + "05" },
                  ],
                },
              }
            : undefined,
    }));

    return {
      tooltip: {
        trigger: "axis",
        formatter: (params: { seriesName: string; value: number; marker: string; axisValue?: string }[]) => {
          let result = `<strong>${params[0]?.axisValue ?? ""}</strong><br/>`;
          params.forEach((param) => {
            result += `${param.marker} ${param.seriesName}: ${param.value?.toFixed(1) ?? "-"}%<br/>`;
          });
          return result;
        },
      },
      legend: {
        data: series.map((s) => s.label),
        bottom: 0,
        textStyle: { color: "#6b7280", fontSize: 11 },
        itemWidth: 12,
        itemHeight: 12,
      },
      grid: {
        left: "3%",
        right: "3%",
        top: "8%",
        bottom: "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: xAxisData,
        boundaryGap: false,
        axisTick: { alignWithLabel: true },
        axisLine: { lineStyle: { color: "#e5e7eb" } },
        axisLabel: { color: "#6b7280", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        axisLine: { lineStyle: { color: "#e5e7eb" } },
        axisLabel: {
          color: "#6b7280",
          fontSize: 11,
          formatter: (value: number) => `${value}%`,
        },
        splitLine: { lineStyle: { color: "#f3f4f6" } },
      },
      series: seriesData,
    };
  }, [data, series]);

  return (
    <div>
      <h3 className="text-sm font-semibold text-light-gray-90 mb-2">{title}</h3>
      <ReactECharts option={option} style={{ height: "200px", width: "100%" }} />
    </div>
  );
}

/**
 * 재무 지표 차트 컴포넌트
 */
export function FinancialMetricsChart({ data }: FinancialMetricsChartProps) {
  // 데이터를 시간순으로 정렬
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      if (a.year !== b.year) return a.year.localeCompare(b.year);
      return a.quarter - b.quarter;
    });
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-light-gray-40">재무 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {CHART_GROUPS.map((group) => (
        <MetricsChartGroup key={group.title} title={group.title} series={group.series} data={sortedData} />
      ))}
    </div>
  );
}
