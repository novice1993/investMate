/**
 * RSS 피드를 가져오는 함수
 */
export async function fetchRSSFeed(url: string): Promise<string> {
  const response = await fetch(url);
  if (response.ok) return await response.text();

  throw new Error(`RSS 피드를 가져올 수 없습니다: ${response.status} ${response.statusText}`);
}
