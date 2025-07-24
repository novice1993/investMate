"use client";

import { useState } from "react";
import { ParsedNewsItem, ParsedNewsFeed } from "../../core/types/news.type";

interface RSSResponse {
  url: string;
  data: ParsedNewsFeed;
}

export default function RSSTestPage() {
  const [url, setUrl] = useState("https://www.mk.co.kr/rss/30000001/");
  const [result, setResult] = useState<RSSResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRSS = async () => {
    if (!url.trim()) {
      setError("URL을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/news?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "RSS를 가져오는데 실패했습니다.");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">RSS API 테스트</h1>

      {/* 예시 URL들 - 상단으로 이동 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-md">
        <h3 className="text-lg font-semibold mb-3 text-black">테스트용 RSS URL</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setUrl("https://www.mk.co.kr/rss/30000001/")} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm">
            매일경제 메인
          </button>
          <button onClick={() => setUrl("https://www.hankyung.com/feed/economy")} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm">
            한국경제 경제
          </button>
        </div>
      </div>

      {/* URL 입력 및 실행 */}
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="RSS URL을 입력하세요"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={fetchRSS} disabled={loading} className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? "가져오는 중..." : "RSS 가져오기"}
          </button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <strong>오류:</strong> {error}
        </div>
      )}

      {/* 결과 표시 - 단순화 */}
      {result && (
        <div className="space-y-4">
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
            <strong>성공!</strong> {result.data.title} ({result.data.items.length}개 기사)
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">기사 목록</h3>
            <div className="space-y-3 max-h-130 overflow-y-auto">
              {result.data.items.map((item: ParsedNewsItem, index) => (
                <div key={index} className="border border-gray-200 p-3 rounded-md hover:bg-gray-50">
                  <h4 className="font-medium text-blue-600 hover:underline">
                    <a href={item.link} target="_blank" rel="noopener noreferrer">
                      {item.title}
                    </a>
                  </h4>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                  <div className="text-xs text-gray-500 mt-2 flex gap-4">
                    <span>{item.pubDate}</span>
                    {item.category && <span>카테고리: {item.category}</span>}
                    {item.author && <span>작성자: {item.author}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
