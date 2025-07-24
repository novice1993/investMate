/**
 * 정규화된 RSS 기사 아이템 타입
 * rss-parser의 원시 데이터를 우리 앱에서 사용하기 위해 변환된 형태
 */
export interface ParsedNewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  category?: string;
  author?: string;
  content?: string;
}

/**
 * 정규화된 RSS 피드 타입
 * rss-parser의 원시 데이터를 우리 앱에서 사용하기 위해 변환된 형태
 */
export interface ParsedNewsFeed {
  title: string;
  description: string;
  link: string;
  items: ParsedNewsItem[];
  lastBuildDate?: string;
  language?: string;
}

/**
 * rss-parser 라이브러리가 반환하는 원시 RSS 피드 타입
 * 외부 RSS 피드의 실제 구조를 그대로 반영
 */
export interface RawRSSFeed {
  title: string;
  description: string;
  link: string;
  language?: string;
  copyright?: string;
  lastBuildDate?: string;
  items: RawRSSItem[];
}

/**
 * rss-parser 라이브러리가 반환하는 원시 RSS 기사 아이템 타입
 * 외부 RSS 피드의 실제 구조를 그대로 반영
 */
export interface RawRSSItem {
  creator?: string;
  title: string;
  link: string;
  pubDate: string;
  author?: string;
  isoDate?: string;
  contentSnippet?: string;
  content?: string;
  categories?: string[];
}
