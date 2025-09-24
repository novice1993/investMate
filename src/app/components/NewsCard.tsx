"use client";

import { News } from "@/core/entities/news.entity";

interface NewsCardProps {
  news: News;
  onClick?: () => void;
}

export function NewsCard({ news, onClick }: NewsCardProps) {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (hours < 1) {
      return `${minutes}분 전`;
    } else if (hours < 24) {
      return `${hours}시간 전`;
    } else {
      return date.toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      });
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      {/* 헤더: 소스 + 날짜 */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">{news.source}</span>
        <span className="text-xs text-gray-500">{formatDate(new Date(news.publishedAt))}</span>
      </div>

      {/* 제목 */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight">{news.title}</h3>

      {/* 요약 */}
      <p className="text-sm text-gray-600 line-clamp-3 mb-3">{news.summary}</p>

      {/* 기자명 (있는 경우) */}
      {news.author && <div className="text-xs text-gray-400">{news.author}</div>}
    </div>
  );
}
