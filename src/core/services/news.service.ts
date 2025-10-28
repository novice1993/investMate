import { XMLParser } from "fast-xml-parser";
import { NewsArticle } from "@/core/entities/news.entity";
import { getSupabaseClient } from "@/core/infrastructure/supabase.infra";
import { MkSitemap, MkSitemapUrl } from "@/core/types/news.type";

/**
 * @fileoverview 뉴스 관련 비즈니스 로직과 데이터베이스 작업을 담당하는 서비스 레이어
 */

// ============================================================================
// Database Operations
// ============================================================================

/**
 * 뉴스 기사를 데이터베이스에 저장합니다.
 * @param article 저장할 뉴스 기사 데이터
 * @returns 저장된 기사 데이터
 */
export async function insertNewsArticle(article: NewsArticle) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("news_articles").insert(article).select().single();

  if (error) {
    console.error("[News Service] Error inserting article:", error);
    throw error;
  }

  return data;
}

/**
 * 여러 뉴스 기사를 한 번에 저장합니다.
 * @param articles 저장할 뉴스 기사 배열
 * @returns 저장된 기사 데이터 배열
 */
export async function insertNewsArticles(articles: NewsArticle[]) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("news_articles").insert(articles).select();

  if (error) {
    console.error("[News Service] Error inserting articles:", error);
    throw error;
  }

  return data;
}

/**
 * URL로 뉴스 기사가 이미 존재하는지 확인합니다.
 * @param url 확인할 기사 URL
 * @returns 존재 여부
 */
export async function checkArticleExists(url: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("news_articles").select("id").eq("url", url).maybeSingle();

  if (error) {
    console.error("[News Service] Error checking article existence:", error);
    throw error;
  }

  return data !== null;
}

/**
 * 모든 뉴스 기사를 조회합니다.
 * @param limit 조회할 기사 수 (기본: 100)
 * @param section 섹션 필터 (선택)
 * @returns 뉴스 기사 배열
 */
export async function fetchNewsArticles(limit: number = 100, section?: string) {
  const supabase = getSupabaseClient();
  let query = supabase.from("news_articles").select("*").order("published_at", { ascending: false }).limit(limit);

  if (section) {
    query = query.eq("section", section);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[News Service] Error fetching articles:", error);
    throw error;
  }

  return data;
}

/**
 * 최신 뉴스 기사 1개를 조회합니다.
 * @returns 최신 뉴스 기사 또는 null
 */
export async function fetchLatestNewsArticle() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("news_articles").select("*").order("published_at", { ascending: false }).limit(1).maybeSingle();

  if (error) {
    console.error("[News Service] Error fetching latest article:", error);
    throw error;
  }

  return data;
}

// ============================================================================
// XML Parsing Operations
// ============================================================================

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

// ============================================================================
// URL Utilities
// ============================================================================

/**
 * URL에서 섹션 정보를 추출합니다.
 * @param url 뉴스 기사 URL
 * @returns 섹션 이름 (예: "stock", "economy") 또는 "unknown"
 * @example
 * extractSectionFromUrl("https://www.mk.co.kr/news/stock/11430262") // "stock"
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
