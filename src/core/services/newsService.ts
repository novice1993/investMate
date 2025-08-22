import Parser from "rss-parser";
import { ParsedNewsFeed, RawRSSFeed, RawRSSItem } from "@/core/types/news.type";

/**
 * RSS XML을 파싱하는 함수
 */
export async function parseRSSFeed(xmlData: string): Promise<ParsedNewsFeed> {
  try {
    const feed = await parseXML(xmlData);
    console.log(feed);
    return normalizeRSSFeed(feed);
  } catch (error) {
    throw new Error(`RSS 파싱에 실패했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
  }
}

// XML 파싱 함수
async function parseXML(xmlData: string): Promise<RawRSSFeed> {
  const parser = new Parser();
  return (await parser.parseString(xmlData)) as RawRSSFeed;
}

// RSS 피드 정규화 함수
function normalizeRSSFeed(feed: RawRSSFeed): ParsedNewsFeed {
  return {
    title: feed.title || "",
    description: feed.description || "",
    link: feed.link || "",
    items: feed.items.map(transformRSSItem),
    lastBuildDate: feed.lastBuildDate,
    language: feed.language,
  };
}

// RSS 아이템 변환 함수
function transformRSSItem(item: RawRSSItem) {
  return {
    title: item.title || "",
    link: item.link || "",
    description: item.contentSnippet || item.content || "",
    pubDate: item.pubDate || item.isoDate || "",
    category: item.categories?.[0] || undefined,
    author: item.creator || item.author || undefined,
    content: item.content || undefined,
  };
}
