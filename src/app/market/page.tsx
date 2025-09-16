"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Security } from "@/core/entities/security.entity";
import { VirtualizedList } from "@/shared/components/VirtualizedList";
import { StockCard } from "../components/StockCard";
import { StockDetailView } from "../components/StockDetailView";

// 가상화 리스트 설정
const ITEM_HEIGHT = 330;

type SortKey = "volume" | "changePercent";
type SortDirection = "asc" | "desc";

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export default function MarketPage() {
  const [stocks, setStocks] = useState<Partial<Security>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<Partial<Security> | null>(null);

  // 필터링 및 정렬을 위한 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "changePercent", direction: "desc" });

  // 동적 높이 계산을 위한 ref와 상태
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600); // 기본값

  // 컨테이너 높이 계산
  useEffect(() => {
    const calculateHeight = () => {
      if (listContainerRef.current) {
        const containerRect = listContainerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // 뷰포트 높이에서 컨테이너 상단 위치와 하단 여백을 제외
        const availableHeight = Math.min(
          containerRect.height || 600, // 컨테이너 자체 높이
          viewportHeight - containerRect.top - 50 // 뷰포트 기준 계산
        );

        setContainerHeight(Math.max(400, availableHeight)); // 최소 400px
      }
    };

    // DOM 렌더링 완료 후 계산
    const timeoutId = setTimeout(calculateHeight, 150);

    // 리사이즈 이벤트 처리
    const handleResize = () => {
      setTimeout(calculateHeight, 50);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", calculateHeight); // 스크롤 시에도 재계산

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", calculateHeight);
    };
  }, [stocks]);

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

  // 필터링 및 정렬 로직
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
      if (prevConfig.key === key) {
        return { ...prevConfig, direction: prevConfig.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "desc" };
    });
  };

  const toggleSortDirection = () => {
    setSortConfig((prevConfig) => ({
      ...prevConfig,
      direction: prevConfig.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleStockClick = (stock: Partial<Security>) => {
    setSelectedStock(stock);
  };

  return (
    <div className="container mx-auto p-6 min-h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">시장 전체보기</h1>
        <p className="text-gray-600">KOSPI 전체 종목의 실시간 현황을 한눈에 확인하세요</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ minHeight: "calc(100vh - 200px)" }}>
        {/* Master: 종목 리스트 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">KOSPI 종목</h2>
            <span className="text-sm text-gray-500">{processedStocks.length > 0 ? `${processedStocks.length}개 종목` : "총 960+ 종목"}</span>
          </div>

          {/* 컨트롤 영역 */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={handleFetchKrxData} disabled={loading} className="bg-blue-500 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:bg-gray-400 text-sm">
              {loading ? "로딩 중..." : "데이터 불러오기"}
            </button>

            <input
              type="text"
              placeholder="종목명/코드 검색..."
              className="border border-gray-300 p-2 rounded text-sm flex-1 min-w-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select className="border border-gray-300 p-2 rounded text-sm" value={sortConfig.key} onChange={(e) => handleSort(e.target.value as SortKey)}>
              <option value="changePercent">등락률</option>
              <option value="volume">거래량</option>
            </select>

            <button onClick={toggleSortDirection} className="bg-gray-200 hover:bg-gray-300 p-2 rounded text-sm">
              {sortConfig.direction === "desc" ? "↓" : "↑"}
            </button>
          </div>

          {/* 에러 표시 */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-400 rounded text-sm">
              <p className="font-semibold">오류:</p>
              <p>{error}</p>
            </div>
          )}

          {/* 종목 리스트 */}
          <div ref={listContainerRef} className="flex-1 min-h-0">
            {processedStocks.length > 0 ? (
              <VirtualizedList
                items={processedStocks}
                itemHeight={ITEM_HEIGHT}
                containerHeight={containerHeight}
                renderItem={(stock) => (
                  <div className="flex justify-center items-center h-full">
                    <StockCard stock={stock} onClick={() => handleStockClick(stock)} className="hover:scale-105" />
                  </div>
                )}
              />
            ) : (
              <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-500">
                <div className="text-4xl mb-2">📊</div>
                <p className="mb-2">종목 데이터를 불러오려면</p>
                <p>&quot;데이터 불러오기&quot; 버튼을 클릭하세요</p>
              </div>
            )}
          </div>
        </div>

        {/* Detail: 상세 정보 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <StockDetailView stock={selectedStock} />
        </div>
      </div>
    </div>
  );
}
