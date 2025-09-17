import Parser from "rss-parser";
import { News } from "@/core/entities/news.entity";
import { RawRSSFeed, RawRSSItem } from "@/core/types/news.type";

/**
 * RSS XML을 News Entity 배열로 변환하는 함수
 */
export async function parseRSSFeed(xmlData: string, source: string): Promise<News[]> {
  try {
    const rawFeed = await parseXML(xmlData);
    return rawFeed.items.map((item) => transformRawItemToNews(item, source));
  } catch (error) {
    throw new Error(`RSS 파싱에 실패했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
  }
}

/**
 * RawRSSItem을 News Entity로 직접 변환하는 함수
 */
function transformRawItemToNews(item: RawRSSItem, source: string): News {
  return {
    id: generateRawNewsId(item),
    title: item.title || "",
    summary: cleanDescription(item.contentSnippet || item.content || ""),
    url: item.link || "",
    publishedAt: parseDate(item.pubDate || item.isoDate || ""),
    source: source,
    author: item.creator || item.author,
  };
}

// XML 파싱 함수
async function parseXML(xmlData: string): Promise<RawRSSFeed> {
  const parser = new Parser();
  return (await parser.parseString(xmlData)) as RawRSSFeed;
}

// News Entity 변환 헬퍼 함수들
function generateRawNewsId(item: RawRSSItem): string {
  // URL 기반 해시 또는 제목+날짜 조합으로 고유 ID 생성
  const linkAndDate = (item.link || "") + (item.pubDate || item.isoDate || "");
  return btoa(linkAndDate)
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 16);
}

function cleanDescription(description: string): string {
  // HTML 태그 제거 및 텍스트 정리
  return description
    .replace(/<[^>]*>/g, "")
    .trim()
    .substring(0, 200);
}

function parseDate(dateString: string): Date {
  // 다양한 날짜 형식을 Date 객체로 변환
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? new Date() : date;
}
