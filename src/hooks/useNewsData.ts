import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NewsArticle } from "@/core/entities/news.entity";
import { jsonHttpClient } from "@/shared/lib/http";

const NEWS_QUERY_KEY = ["news"];

async function fetchNews(): Promise<NewsArticle[]> {
  const result = await jsonHttpClient.get<{ data: NewsArticle[] }>("/api/news?source=mk-stock,hankyung-economy,hankyung-finance");

  if (result.data && Array.isArray(result.data)) {
    return result.data;
  }

  return [];
}

export function useNewsData(autoFetch = true) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: NEWS_QUERY_KEY,
    queryFn: fetchNews,
    enabled: autoFetch,
  });

  const clearNews = () => {
    queryClient.setQueryData(NEWS_QUERY_KEY, []);
  };

  return {
    news: data ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    fetchNewsData: refetch,
    clearNews,
  };
}
