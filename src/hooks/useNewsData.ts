import { useState, useEffect } from "react";
import { NewsArticle } from "@/core/entities/news.entity";

interface UseNewsDataReturn {
  news: NewsArticle[];
  loading: boolean;
  error: string | null;
  fetchNewsData: () => Promise<void>;
  clearNews: () => void;
}

export function useNewsData(autoFetch = true): UseNewsDataReturn {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNewsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/news?source=mk-stock,hankyung-economy,hankyung-finance");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const newsData = await response.json();

      if (newsData.data && Array.isArray(newsData.data)) {
        setNews(newsData.data);
      } else {
        setNews([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "뉴스를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const clearNews = () => {
    setNews([]);
    setError(null);
  };

  // 자동 로드 기능
  useEffect(() => {
    if (autoFetch) {
      fetchNewsData();
    }
  }, [autoFetch]);

  return {
    news,
    loading,
    error,
    fetchNewsData,
    clearNews,
  };
}
