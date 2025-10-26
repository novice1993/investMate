"use client";

import { useState } from "react";
import { NewsArticle } from "@/core/entities/news.entity";

interface NewsCardProps {
  news: NewsArticle;
}

export function NewsCard({ news }: NewsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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

  const handleCardClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleOpenUrl = (e: React.MouseEvent) => {
    e.stopPropagation(); // 카드 클릭 이벤트 전파 방지
    window.open(news.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={handleCardClick}>
      {/* 헤더: 소스 + 날짜 */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">{news.source}</span>
        <span className="text-xs text-gray-500">{formatDate(news.published_at)}</span>
      </div>

      {/* 제목 */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight">{news.title}</h3>

      {/* 요약 (토글 가능) */}
      {isExpanded && <p className="text-sm text-gray-600 mb-3 whitespace-pre-line">{news.summary}</p>}

      {/* 하단: 토글 표시 + 원문 보기 버튼 */}
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">{isExpanded ? "요약 숨기기 ▲" : "요약 보기 ▼"}</span>
        <button onClick={handleOpenUrl} className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded transition-colors">
          원문 보기
        </button>
      </div>
    </div>
  );
}
