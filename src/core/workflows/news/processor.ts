/**
 * @fileoverview 기사 개별 처리 로직
 * 2단계 분리: 스크래핑 병렬 처리 → AI 요약 병렬 처리
 */

import { NewsArticle } from "@/core/entities/news.entity";
import { ScrapedArticle } from "@/core/entities/scraped-article.entity";
import { scrapeArticle } from "@/core/services/news-scraper.service";
import { summarizeArticle } from "@/core/services/news-summarizer.service";
import { ProcessingResults } from "./types";

// ============================================================================
// Public API
// ============================================================================

/**
 * 단일 그룹 처리 (2단계: 스크래핑 병렬 처리 → AI 요약)
 */
export async function processArticleGroup(group: NewsArticle[], groupIndex: number, maxConcurrentRequests: number): Promise<ProcessingResults> {
  const startIndex = groupIndex * maxConcurrentRequests + 1;
  const endIndex = startIndex + group.length - 1;

  console.log(`[Workflow] ${startIndex}~${endIndex}번째 기사 처리 중...`);

  // 1단계: 모든 HTTP 요청 병렬 처리 (paper_date 체크 포함)
  const scrapingResults = await scrapeAllArticles(group);

  // 2단계: 성공한 신문 기사만 필터링
  const validArticles = extractValidScrapedArticles(scrapingResults, group);

  if (validArticles.length === 0) {
    console.log(`[Workflow] 유효한 신문 기사 없음 (모두 웹 전용 또는 실패)`);
    return { processedArticles: [], errors: [] };
  }

  // 3단계: AI 요약만 처리
  const summaryResults = await summarizeAllArticles(validArticles);

  return classifyResults(summaryResults, validArticles);
}

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * 1단계: 모든 기사 스크래핑 (HTTP 병렬 처리)
 */
async function scrapeAllArticles(group: NewsArticle[]): Promise<PromiseSettledResult<ScrapedArticle | null>[]> {
  return Promise.allSettled(group.map((newsItem) => scrapeArticle(newsItem.url)));
}

/**
 * 2단계: 유효한 신문 기사만 추출
 */
interface ValidArticle {
  newsItem: NewsArticle;
  scrapedArticle: ScrapedArticle;
}

function extractValidScrapedArticles(scrapingResults: PromiseSettledResult<ScrapedArticle | null>[], group: NewsArticle[]): ValidArticle[] {
  const validArticles: ValidArticle[] = [];

  scrapingResults.forEach((result, idx) => {
    const newsItem = group[idx];

    // 스크래핑 실패
    if (result.status === "rejected") {
      console.warn(`[Workflow] ✗ ${newsItem.title} - 스크래핑 실패: ${result.reason instanceof Error ? result.reason.message : "알 수 없는 오류"}`);
      return;
    }

    // 웹 전용 기사
    if (result.value === null) {
      console.log(`[Workflow] ○ ${newsItem.title} - 웹 전용 기사 스킵`);
      return;
    }

    // 신문 기사
    validArticles.push({
      newsItem,
      scrapedArticle: result.value,
    });
  });

  console.log(`[Workflow] 스크래핑 완료: ${validArticles.length}개 신문 기사 발견`);
  return validArticles;
}

/**
 * 3단계: AI 요약 병렬 처리
 */
async function summarizeAllArticles(validArticles: ValidArticle[]): Promise<PromiseSettledResult<string | null>[]> {
  return Promise.allSettled(validArticles.map((article) => summarizeArticle(article.scrapedArticle)));
}

/**
 * 4단계: AI 요약 결과를 성공/실패로 분류
 */
function classifyResults(summaryResults: PromiseSettledResult<string | null>[], validArticles: ValidArticle[]): ProcessingResults {
  const processedArticles: NewsArticle[] = [];
  const errors: Array<{ url: string; error: string }> = [];

  summaryResults.forEach((result, idx) => {
    const { newsItem } = validArticles[idx];

    // AI 요약 예외 발생
    if (result.status === "rejected") {
      const errorMsg = result.reason instanceof Error ? result.reason.message : "AI 요약 처리 실패";
      console.warn(`[Workflow] ✗ ${newsItem.title} - ${errorMsg}`);
      errors.push({ url: newsItem.url, error: errorMsg });
      return;
    }

    // AI 요약 실패 (null 반환)
    if (result.value === null) {
      console.warn(`[Workflow] ✗ ${newsItem.title} - AI 요약 실패 (null 반환)`);
      errors.push({ url: newsItem.url, error: "AI 요약 실패" });
      return;
    }

    // AI 요약 성공
    console.log(`[Workflow] ✓ ${newsItem.title}`);
    processedArticles.push({ ...newsItem, summary: result.value });
  });

  return { processedArticles, errors };
}
