"use client";

import { useMemo, useState } from "react";
import { Security } from "@/core/entities/security.entity";
import { VirtualizedList } from "@/shared/components/VirtualizedList";
import { StockCard } from "./StockCard";

// 이 페이지에서 사용할 가상화 리스트의 상수 정의
const ITEM_HEIGHT = 330; // StockCard의 예상 높이 (px)
const CONTAINER_HEIGHT = 800; // 스크롤 컨테이너의 높이 (px)

type SortKey = "volume" | "changePercent";
type SortDirection = "asc" | "desc";

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export default function KrxTestPage() {
  const [stocks, setStocks] = useState<Partial<Security>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 필터링 및 정렬을 위한 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "changePercent", direction: "desc" });

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

  // 필터링 및 정렬 로직 (useMemo로 최적화)
  const processedStocks = useMemo(() => {
    let processableStocks = [...stocks];

    // 1. 필터링
    if (searchTerm) {
      processableStocks = processableStocks.filter((stock) => stock.name?.toLowerCase().includes(searchTerm.toLowerCase()) || stock.symbol?.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // 2. 정렬
    if (sortConfig.key) {
      processableStocks.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return processableStocks;
  }, [stocks, searchTerm, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prevConfig) => {
      // 동일한 키를 다시 누르면 정렬 순서만 변경
      if (prevConfig.key === key) {
        return { ...prevConfig, direction: prevConfig.direction === "asc" ? "desc" : "asc" };
      }
      // 새로운 키를 선택하면 내림차순으로 기본 설정
      return { key, direction: "desc" };
    });
  };

  const toggleSortDirection = () => {
    setSortConfig((prevConfig) => ({
      ...prevConfig,
      direction: prevConfig.direction === "asc" ? "desc" : "asc",
    }));
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">KRX Data Fetch Test (Virtualization)</h1>
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <button onClick={handleFetchKrxData} disabled={loading} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400">
          {loading ? "Loading..." : "Fetch KOSPI Securities"}
        </button>

        {/* 필터링 및 정렬 UI */}
        <input type="text" placeholder="종목명/코드 검색..." className="border p-2 rounded text-black" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <select className="border p-2 rounded text-black" value={sortConfig.key} onChange={(e) => handleSort(e.target.value as SortKey)}>
          <option value="changePercent">등락률</option>
          <option value="volume">거래량</option>
        </select>
        <button onClick={toggleSortDirection} className="bg-gray-200 p-2 rounded text-black">
          {sortConfig.direction === "desc" ? "내림차순" : "오름차순"}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 border border-red-400 rounded">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      <div className="mt-4">
        {processedStocks.length > 0 && (
          <VirtualizedList
            items={processedStocks}
            itemHeight={ITEM_HEIGHT}
            containerHeight={CONTAINER_HEIGHT}
            renderItem={(stock) => (
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
