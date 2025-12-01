"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

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

export function FinancialMetricsChart({ data }: FinancialMetricsChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      period: `${item.year} Q${item.quarter}`,
      ROE: item.roe,
      부채비율: item.debt_ratio,
      영업이익률: item.operating_margin,
      순이익률: item.net_margin,
      매출YoY: item.revenue_yoy,
      영업이익YoY: item.operating_profit_yoy,
      순이익YoY: item.net_income_yoy,
    }));
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-light-gray-40">재무 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 수익성 지표 */}
      <div>
        <h3 className="text-sm font-semibold text-light-gray-90 mb-3">수익성 지표</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="period" stroke="#6b7280" style={{ fontSize: "12px" }} />
            <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} tickFormatter={(value) => `${value}%`} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
                fontSize: "12px",
              }}
              formatter={(value: number) => `${value.toFixed(1)}%`}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Line type="monotone" dataKey="ROE" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="영업이익률" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="순이익률" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 안정성 지표 */}
      <div>
        <h3 className="text-sm font-semibold text-light-gray-90 mb-3">안정성 지표</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="period" stroke="#6b7280" style={{ fontSize: "12px" }} />
            <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} tickFormatter={(value) => `${value}%`} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
                fontSize: "12px",
              }}
              formatter={(value: number) => `${value.toFixed(1)}%`}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Line type="monotone" dataKey="부채비율" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 성장성 지표 */}
      <div>
        <h3 className="text-sm font-semibold text-light-gray-90 mb-3">성장성 지표 (YoY)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="period" stroke="#6b7280" style={{ fontSize: "12px" }} />
            <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} tickFormatter={(value) => `${value}%`} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
                fontSize: "12px",
              }}
              formatter={(value: number) => `${value.toFixed(1)}%`}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Line type="monotone" dataKey="매출YoY" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="영업이익YoY" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="순이익YoY" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
