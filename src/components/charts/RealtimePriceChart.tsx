"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PriceHistory {
  timestamp: string;
  price: number;
}

interface RealtimePriceChartProps {
  data: PriceHistory[];
}

export function RealtimePriceChart({ data }: RealtimePriceChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      time: new Date(item.timestamp).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      price: item.price,
    }));
  }, [data]);

  const priceRange = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 0 };
    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1 || 1;
    return {
      min: Math.floor(min - padding),
      max: Math.ceil(max + padding),
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-light-gray-40">실시간 데이터 수신 대기 중...</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: "12px" }} />
        <YAxis domain={[priceRange.min, priceRange.max]} stroke="#6b7280" style={{ fontSize: "12px" }} tickFormatter={(value) => value.toLocaleString()} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            fontSize: "12px",
          }}
          labelStyle={{ color: "#374151", fontWeight: "bold" }}
          formatter={(value: number) => [`${value.toLocaleString()}원`, "가격"]}
        />
        <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={false} animationDuration={300} />
      </LineChart>
    </ResponsiveContainer>
  );
}
