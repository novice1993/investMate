import { textHttpClient } from "@/shared/lib/http";

/**
 * RSS 피드를 가져오는 함수
 */
export async function fetchRSSFeed(url: string): Promise<string> {
  return textHttpClient.get(url);
}
