"use client";

import { useState, useMemo } from "react";
import { useNewsData } from "@/hooks/useNewsData";
import { VirtualizedList } from "@/shared/components/VirtualizedList";
import { DateFilter } from "./DateFilter";
import { NewsCard } from "./NewsCard";
import { QuickFilterType, DateRange } from "./types";
import { applyDateFilter } from "./utils";

interface NewsListSectionProps {
  variant?: "full" | "compact";
  showHeader?: boolean;
  showFilter?: boolean;
  className?: string;
}

export function NewsListSection({ variant = "full", showHeader = true, showFilter = true, className = "" }: NewsListSectionProps) {
  const { news, loading, error, fetchNewsData } = useNewsData();
  const [filterType, setFilterType] = useState<QuickFilterType>("all");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  // 날짜 필터 적용
  const filteredNews = useMemo(() => {
    return applyDateFilter(news, filterType, customRange);
  }, [news, filterType, customRange]);

  const handleFilterChange = (newFilterType: QuickFilterType, newCustomRange?: DateRange) => {
    setFilterType(newFilterType);
    setCustomRange(newCustomRange);
  };

  return (
    <div className={className}>
      {/* 헤더 */}
      {showHeader && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">실시간 뉴스</h1>
            <button onClick={fetchNewsData} disabled={loading} className="bg-green-500 hover:bg-green-700 text-white font-medium py-2 px-4 rounded disabled:bg-gray-400 text-sm">
              {loading ? "로딩중..." : "새로고침"}
            </button>
          </div>
          <p className="text-gray-600 text-sm md:text-base">매일경제 증권 뉴스</p>
        </div>
      )}

      {/* 날짜 필터 */}
      {showFilter && (
        <div className="mb-4">
          <DateFilter value={filterType} customRange={customRange} onChange={handleFilterChange} />
        </div>
      )}

      {/* 에러 표시 */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-400 rounded text-sm">
          <p className="font-semibold">오류:</p>
          <p>{error}</p>
        </div>
      )}

      {/* 뉴스 리스트 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">뉴스를 불러오는 중...</div>
        </div>
      ) : filteredNews.length > 0 ? (
        <>
          <VirtualizedList
            items={filteredNews}
            estimateSize={180}
            containerHeight={variant === "compact" ? 400 : 600}
            overscanCount={15}
            renderItem={(newsItem, measureElement) => (
              <div ref={(node) => measureElement(node)} className="px-4 py-2">
                <NewsCard news={newsItem} />
              </div>
            )}
            className="border rounded-md"
          />
          <div className="text-center py-4 text-sm text-gray-400">
            총 {filteredNews.length}개의 뉴스 {news.length !== filteredNews.length && `(전체 ${news.length}개)`}
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-2">📰</div>
          <p>선택한 기간에 뉴스가 없습니다</p>
          <p className="text-sm mt-1">다른 기간을 선택해보세요</p>
        </div>
      )}
    </div>
  );
}
