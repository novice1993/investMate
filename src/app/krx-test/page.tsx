"use client";

import { useState } from "react";
import { Security } from "@/core/entities/security.entity";
import { VirtualizedList } from "@/shared/components/VirtualizedList";
import { StockCard } from "./StockCard";

// 이 페이지에서 사용할 가상화 리스트의 상수 정의
const ITEM_HEIGHT = 330; // StockCard의 예상 높이 (px)
const CONTAINER_HEIGHT = 800; // 스크롤 컨테이너의 높이 (px)

export default function KrxTestPage() {
  const [stocks, setStocks] = useState<Partial<Security>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchKrxData = async () => {
    setLoading(true);
    setError(null);
    setStocks([]);
    try {
      const response = await fetch("/api/krx/securities?market=KOSPI");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch data");
      }
      const data = await response.json();
      setStocks(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">KRX Data Fetch Test (Virtualization)</h1>
      <button onClick={handleFetchKrxData} disabled={loading} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400">
        {loading ? "Loading..." : "Fetch KOSPI Securities"}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 border border-red-400 rounded">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      <div className="mt-4">
        {stocks.length > 0 && (
          <VirtualizedList
            items={stocks}
            itemHeight={ITEM_HEIGHT}
            containerHeight={CONTAINER_HEIGHT}
            renderItem={(stock) => (
              // VirtualizedList의 각 아이템 영역 안에서 StockCard를 중앙 정렬합니다.
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                <StockCard stock={stock} />
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}
