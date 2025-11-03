import { XMLParser } from "fast-xml-parser";
import { NewsArticle } from "@/core/entities/news.entity";
import { MkSitemap, MkSitemapUrl } from "@/core/infrastructure/news/news.type";

/**
 * 뉴스 관련 비즈니스 로직 - 사이트맵 XML 파싱 및 변환
 */

/**
 * 매경 사이트맵 XML을 NewsArticle 배열로 변환하는 함수
 */
export function parseMKSitemap(xmlData: string, allowedSections: string[]): NewsArticle[] {
  const parser = new XMLParser();
  const jsonObj: MkSitemap = parser.parse(xmlData);

  if (!jsonObj.urlset || !Array.isArray(jsonObj.urlset.url)) {
    return [];
  }

  const allUrls: MkSitemapUrl[] = jsonObj.urlset.url;
  const filteredUrls = filterMkSitemapUrlsBySection(allUrls, allowedSections);

  return filteredUrls.map(transformSitemapUrlToNewsArticle);
}

/**
 * URL에서 섹션을 추출하여 허용된 섹션의 기사만 필터링하는 함수
 */
function filterMkSitemapUrlsBySection(urls: MkSitemapUrl[], allowedSections: string[]): MkSitemapUrl[] {
  return urls.filter((url) => {
    try {
      const urlPath = new URL(url.loc).pathname; // ex: /news/stock/11430262
      const pathSegments = urlPath.split("/").filter(Boolean); // ex: ["news", "stock", "11430262"]

      if (pathSegments.length > 1 && pathSegments[0] === "news") {
        const section = pathSegments[1];
        return allowedSections.includes(section);
      }
      return false;
    } catch (error) {
      console.error(`Invalid URL found: ${url.loc}`, error);
      return false;
    }
  });
}

/**
 * MkSitemapUrl을 NewsArticle로 변환하는 함수
 */
function transformSitemapUrlToNewsArticle(sitemapUrl: MkSitemapUrl): NewsArticle {
  const newsItem = sitemapUrl["news:news"];

  return {
    title: newsItem["news:title"],
    url: sitemapUrl.loc,
    summary: "", // AI 요약 전이므로 빈 문자열
    section: extractSectionFromUrl(sitemapUrl.loc),
    source: newsItem["news:publication"]["news:name"],
    published_at: new Date(newsItem["news:publication_date"]).toISOString(),
  };
}

/**
 * URL에서 섹션 정보를 추출합니다.
 */
export function extractSectionFromUrl(url: string): string {
  try {
    const urlPath = new URL(url).pathname;
    const pathSegments = urlPath.split("/").filter(Boolean);

    if (pathSegments.length > 1 && pathSegments[0] === "news") {
      return pathSegments[1];
    }

    return "unknown";
  } catch (error) {
    console.error(`[News Service] URL 파싱 실패: ${url}`, error);
    return "unknown";
  }
}
