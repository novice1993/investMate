import { textHttpClient } from "@/shared/lib/http";

/**
 * 매일경제 사이트맵을 가져오는 함수
 */
export async function fetchMKSitemap(url: string): Promise<string> {
  return textHttpClient.get(url);
}
