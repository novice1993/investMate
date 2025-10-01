import { XMLParser } from "fast-xml-parser";
import { News } from "@/core/entities/news.entity";
import { MkSitemap, MkSitemapUrl } from "@/core/types/news.type";

/**
 * 매경 사이트맵 XML을 News Entity 배열로 변환하는 함수
 */
export function parseMKSitemap(xmlData: string, allowedSections: string[]): News[] {
  const parser = new XMLParser();
  const jsonObj: MkSitemap = parser.parse(xmlData);

  if (!jsonObj.urlset || !Array.isArray(jsonObj.urlset.url)) {
    return [];
  }

  const allUrls: MkSitemapUrl[] = jsonObj.urlset.url;
  const filteredUrls = filterMkSitemapUrlsBySection(allUrls, allowedSections);

  return filteredUrls.map(transformSitemapUrlToNews);
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
 * MkSitemapUrl을 News Entity로 변환하는 함수
 */
function transformSitemapUrlToNews(sitemapUrl: MkSitemapUrl): News {
  const newsItem = sitemapUrl["news:news"];

  return {
    id: generateNewsId(sitemapUrl.loc),
    title: newsItem["news:title"],
    summary: "", // 사이트맵에는 요약 정보가 없으므로 빈 문자열로 처리
    url: sitemapUrl.loc,
    publishedAt: new Date(newsItem["news:publication_date"]),
    source: newsItem["news:publication"]["news:name"],
    // author 정보는 사이트맵에 없으므로 비워둠
  };
}

function generateNewsId(url: string): string {
  // URL을 기반으로 고유 ID 생성
  return btoa(url)
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 16);
}
