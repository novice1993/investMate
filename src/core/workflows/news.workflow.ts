import { NewsArticle } from "@/core/entities/news.entity";
import { fetchMKSitemap } from "@/core/infrastructure/news.infra";
import { summarizeArticle } from "@/core/services/llm.service";
import { parseMKSitemap, checkArticleExists, insertNewsArticles, extractSectionFromUrl } from "@/core/services/news.service";
import { scrapeArticle } from "@/core/services/scrape.service";

/**
 * @fileoverview 뉴스 수집 워크플로우
 * sitemap 조회 → 중복 체크 → 스크래핑 → AI 요약 → 배치 저장
 */

const MK_SITEMAP_URL = "https://www.mk.co.kr/sitemap/latest-articles";
const ALLOWED_SECTIONS = ["economy", "business", "realestate", "stock", "it", "politics"];

export interface NewsCollectionResult {
  success: boolean;
  collectedCount: number;
  skippedCount: number;
  errors: Array<{ url: string; error: string }>;
  message: string;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * 뉴스 수집 워크플로우 실행
 *
 * 프로세스:
 * 1. 매경 sitemap에서 최신 기사 목록 조회
 * 2. 최신순으로 순회하며 중복 체크
 * 3. 이미 존재하는 기사 발견 시 중단 (이후 기사는 모두 처리됨)
 * 4. 새 기사는 스크래핑 + AI 요약 후 메모리에 누적
 * 5. 모든 새 기사를 한 번에 DB에 저장 (API 요청 최소화)
 */
export async function runNewsCollectionWorkflow(): Promise<NewsCollectionResult> {
  console.log("[Workflow] 뉴스 수집 시작");

  const newArticles: NewsArticle[] = [];
  const errors: Array<{ url: string; error: string }> = [];
  let skippedCount = 0;

  try {
    // 1. Sitemap 조회 및 파싱
    console.log("[Workflow] Sitemap 조회 중...");
    const xmlData = await fetchMKSitemap(MK_SITEMAP_URL);
    const newsList = parseMKSitemap(xmlData, ALLOWED_SECTIONS);
    console.log(`[Workflow] ${newsList.length}개 기사 발견`);

    if (newsList.length === 0) {
      console.log("[Workflow] 수집할 기사가 없습니다.");
      return {
        success: true,
        collectedCount: 0,
        skippedCount: 0,
        errors: [],
        message: "수집할 기사가 없습니다.",
      };
    }

    // 2. 최신순 순회
    for (const newsItem of newsList) {
      try {
        // 중복 체크
        if (await checkArticleExists(newsItem.url)) {
          console.log(`[Workflow] 기존 기사 발견, 중단: ${newsItem.url}`);
          skippedCount = newsList.length - newArticles.length;
          break;
        }

        console.log(`[Workflow] 새 기사 처리 중: ${newsItem.title}`);

        // 기사 처리 (스크래핑 + 요약 + 변환)
        const article = await processNewsItem(newsItem);
        newArticles.push(article);

        console.log(`[Workflow] ✓ 처리 완료`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Workflow] 기사 처리 실패: ${newsItem.url}`, error);
        errors.push({ url: newsItem.url, error: errorMessage });
      }
    }

    // 3. 배치 저장 (API 요청 1회)
    if (newArticles.length > 0) {
      console.log(`[Workflow] ${newArticles.length}개 기사 DB 저장 중...`);
      await insertNewsArticles(newArticles);
      console.log(`[Workflow] ✓ DB 저장 완료`);
    }

    const result: NewsCollectionResult = {
      success: true,
      collectedCount: newArticles.length,
      skippedCount,
      errors,
      message: `${newArticles.length}개 기사 수집 완료`,
    };

    console.log("[Workflow] 뉴스 수집 완료:", result);
    return result;
  } catch (error) {
    console.error("[Workflow] 치명적 오류 발생:", error);
    return {
      success: false,
      collectedCount: newArticles.length,
      skippedCount,
      errors,
      message: error instanceof Error ? error.message : "알 수 없는 오류 발생",
    };
  }
}

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * 단일 뉴스 기사를 처리하여 DB 저장 형식으로 변환
 * @private
 */
async function processNewsItem(newsItem: { title: string; url: string; source: string; publishedAt: Date }): Promise<NewsArticle> {
  // 1. HTML 스크래핑
  const scrapedArticle = await scrapeArticle(newsItem.url);

  // 2. AI 요약
  const summary = await summarizeArticle(scrapedArticle);

  // 3. URL에서 섹션 추출
  const section = extractSectionFromUrl(newsItem.url);

  // 4. NewsArticle 형식으로 변환
  return {
    title: newsItem.title,
    url: newsItem.url,
    summary,
    section,
    source: newsItem.source,
    published_at: newsItem.publishedAt.toISOString(),
  };
}
