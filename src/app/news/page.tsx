"use client";

import React from "react";
import { NewsCard } from "@/components/news/NewsCard";
import { useNewsData } from "@/hooks/useNewsData";

export default function NewsPage() {
  const { news, loading, error, fetchNewsData } = useNewsData();

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">실시간 뉴스</h1>
          <button onClick={fetchNewsData} disabled={loading} className="bg-green-500 hover:bg-green-700 text-white font-medium py-2 px-4 rounded disabled:bg-gray-400 text-sm">
            {loading ? "로딩중..." : "새로고침"}
          </button>
        </div>
        <p className="text-gray-600 text-sm md:text-base">매일경제 · 한국경제 증권/경제 뉴스</p>
      </div>

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
      ) : news.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4">
            {news.map((newsItem) => (
              <NewsCard key={newsItem.id} news={newsItem} />
            ))}
          </div>
          <div className="text-center py-4 text-sm text-gray-400">총 {news.length}개의 뉴스</div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-2">📰</div>
          <p>뉴스 데이터가 없습니다</p>
          <p className="text-sm mt-1">새로고침 버튼을 클릭해보세요</p>
        </div>
      )}
    </div>
  );
}
