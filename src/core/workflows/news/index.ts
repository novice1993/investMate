/**
 * @fileoverview 뉴스 수집 워크플로우
 * sitemap 조회 → 중복 체크 → 스크래핑 → AI 개별 요약 → 배치 저장
 */

import { NewsArticle } from "@/core/entities/news.entity";
import { checkArticlesExistBatch, insertNewsArticles } from "@/core/infrastructure/news/news-repository.infra";
import { fetchMKSitemap } from "@/core/infrastructure/news/sitemap.infra";
import { getLastRunTime, updateLastRunTime, filterArticlesSinceLastRun } from "@/core/services/news-execution-tracker.service";
import { parseMKSitemap } from "@/core/services/news-parser.service";
import { scrapeArticle } from "@/core/services/news-scraper.service";
import { createRPMState, splitIntoGroups, processGroupsWithRPMLimit } from "./rpm";
import { NewsCollectionResult } from "./types";

const MK_SITEMAP_URL = "https://www.mk.co.kr/sitemap/latest-articles";
const MAX_CONCURRENT_REQUESTS = 5;

// ============================================================================
// Public API
// ============================================================================

/**
 * 뉴스 수집 워크플로우 실행
 *
 * 프로세스:
 * 1. 매경 sitemap에서 최신 기사 목록 조회 및 시간 기반 필터링
 * 2. 배치 중복 체크 (1회 쿼리)
 * 3. 스크래핑 (전체 병렬 처리, paper_date 체크)
 * 4. AI 요약 (신문 기사만 5개씩 그룹 + RPM 제한)
 * 5. 성공한 기사만 DB에 저장 후 마지막 실행 시간 업데이트
 */
export async function runNewsCollectionWorkflow(): Promise<NewsCollectionResult> {
  console.log("[Workflow] 뉴스 수집 시작");

  try {
    // 1. Sitemap 조회, 파싱 및 시간 기반 필터링
    const newsList = await fetchAndParseSitemap();

    if (newsList.length === 0) {
      return createSuccessResult(0, 0, []);
    }

    // 2. 배치 중복 체크
    const { itemsToProcess, skippedCount } = await filterDuplicateArticles(newsList);

    if (itemsToProcess.length === 0) {
      return createSuccessResult(0, skippedCount, []);
    }

    // 3. 스크래핑 (전체 병렬 처리)
    const validArticles = await scrapeArticles(itemsToProcess);

    if (validArticles.length === 0) {
      console.log("[Workflow] 신문 기사 없음 (모두 웹 전용)");
      return createSuccessResult(0, skippedCount, []);
    }

    // 4. AI 요약 (5개씩 그룹 + RPM 제한)
    const { processedArticles, errors } = await summarizeArticles(validArticles);

    // 5. DB 배치 저장 및 성공 시 마지막 실행 시간 업데이트
    if (processedArticles.length > 0) {
      await saveArticlesToDatabase(processedArticles);
      updateLastRunTime();
    }

    const result = createSuccessResult(processedArticles.length, skippedCount, errors);
    console.log("[Workflow] 뉴스 수집 완료:", result);
    return result;
  } catch (error) {
    console.error("[Workflow] 치명적 오류 발생:", error);
    return createErrorResult(error);
  }
}

// ============================================================================
// Private Helpers - 각 워크플로우 단계
// ============================================================================

/**
 * 1단계: Sitemap 조회, 파싱 및 시간 기반 필터링
 */
async function fetchAndParseSitemap(): Promise<NewsArticle[]> {
  console.log("[Workflow] Sitemap 조회 중...");
  const xmlData = await fetchMKSitemap(MK_SITEMAP_URL);
  const allArticles = parseMKSitemap(xmlData);

  // 마지막 실행 시간 이후 기사만 필터링
  const lastRunTime = getLastRunTime();
  const filteredArticles = filterArticlesSinceLastRun(allArticles, lastRunTime);

  console.log(`[Workflow] ${filteredArticles.length}개 기사 발견 (전체 ${allArticles.length}개 중)`);
  return filteredArticles;
}

/**
 * 2단계: 중복 체크 (배치 처리)
 */
async function filterDuplicateArticles(newsList: NewsArticle[]): Promise<{ itemsToProcess: NewsArticle[]; skippedCount: number }> {
  if (newsList.length === 0) {
    return { itemsToProcess: [], skippedCount: 0 };
  }

  // 배치로 중복 체크 (1회 쿼리)
  const urls = newsList.map((item) => item.url);
  const existingUrls = await checkArticlesExistBatch(urls);

  // 중복되지 않은 기사만 필터링
  const itemsToProcess = newsList.filter((item) => !existingUrls.has(item.url));

  const skippedCount = newsList.length - itemsToProcess.length;
  console.log(`[Workflow] 중복 체크 완료: ${itemsToProcess.length}개 처리 예정, ${skippedCount}개 스킵`);

  return { itemsToProcess, skippedCount };
}

/**
 * 3단계: 스크래핑 (전체 병렬 처리, RPM 제한 없음)
 */
async function scrapeArticles(itemsToProcess: NewsArticle[]): Promise<NewsArticle[]> {
  console.log(`[Workflow] ${itemsToProcess.length}개 기사 스크래핑 시작`);

  const scrapingResults = await Promise.allSettled(itemsToProcess.map((item) => scrapeArticle(item.url)));

  const validArticles: NewsArticle[] = [];

  scrapingResults.forEach((result, idx) => {
    const newsItem = itemsToProcess[idx];

    if (result.status === "rejected") {
      console.warn(`[Workflow] ✗ ${newsItem.title} - 스크래핑 실패: ${result.reason instanceof Error ? result.reason.message : "알 수 없는 오류"}`);
      return;
    }

    if (result.value === null) {
      console.log(`[Workflow] ○ ${newsItem.title} - 웹 전용 기사 스킵`);
      return;
    }

    // paper_date를 포함한 NewsArticle 생성
    validArticles.push({
      ...newsItem,
      paper_date: result.value.paper_date,
    });
  });

  console.log(`[Workflow] 스크래핑 완료: ${validArticles.length}개 신문 기사 발견`);
  return validArticles;
}

/**
 * 4단계: AI 요약 (5개씩 그룹 + RPM 제한)
 */
async function summarizeArticles(validArticles: NewsArticle[]): Promise<{ processedArticles: NewsArticle[]; errors: Array<{ url: string; error: string }> }> {
  if (validArticles.length === 0) {
    return { processedArticles: [], errors: [] };
  }

  console.log(`[Workflow] ${validArticles.length}개 신문 기사 AI 요약 시작`);

  const groups = splitIntoGroups(validArticles, MAX_CONCURRENT_REQUESTS);
  const rpmState = createRPMState();

  const allResults = await processGroupsWithRPMLimit(groups, rpmState);

  console.log(`[Workflow] AI 요약 완료: 성공 ${allResults.processedArticles.length}개, 실패 ${allResults.errors.length}개`);

  return allResults;
}

/**
 * 5단계: DB 배치 저장
 */
async function saveArticlesToDatabase(articles: NewsArticle[]): Promise<void> {
  console.log(`[Workflow] ${articles.length}개 기사 DB 저장 중...`);
  await insertNewsArticles(articles);
  console.log(`[Workflow] ✓ DB 저장 완료`);
}

// ============================================================================
// Private Helpers - 결과 생성
// ============================================================================

/**
 * 성공 결과 생성
 */
function createSuccessResult(collectedCount: number, skippedCount: number, errors: Array<{ url: string; error: string }>): NewsCollectionResult {
  return {
    success: true,
    collectedCount,
    skippedCount,
    errors,
    message: `${collectedCount}개 기사 수집 완료`,
  };
}

/**
 * 에러 결과 생성
 */
function createErrorResult(error: unknown): NewsCollectionResult {
  return {
    success: false,
    collectedCount: 0,
    skippedCount: 0,
    errors: [],
    message: error instanceof Error ? error.message : "알 수 없는 오류 발생",
  };
}
