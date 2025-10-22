import { NewsArticle } from "@/core/entities/news.entity";
import { ScrapedArticle } from "@/core/entities/scraped-article.entity";
import { fetchMKSitemap } from "@/core/infrastructure/news.infra";
import { parseMKSitemap, checkArticleExists, insertNewsArticles } from "@/core/services/news.service";
import { scrapeArticle } from "@/core/services/scrape.service";
import { summarizeArticlesBatch } from "../services/llm.service";

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
 * 2. 중복 체크 (직렬 처리)
 * 3. 이미 존재하는 기사 발견 시 중단 (이후 기사는 모두 처리됨)
 * 4. 새 기사는 병렬로 스크래핑 + AI 배치 요약 (1회 API 호출)
 * 5. 성공한 기사만 DB에 저장
 */
export async function runNewsCollectionWorkflow(): Promise<NewsCollectionResult> {
  console.log("[Workflow] 뉴스 수집 시작");

  try {
    // 1. Sitemap 조회 및 파싱
    const newsList = await fetchAndParseSitemap();

    if (newsList.length === 0) {
      return createSuccessResult(0, 0, []);
    }

    // 2. 중복 체크 (직렬 처리)
    const { itemsToProcess, skippedCount } = await filterDuplicateArticles(newsList);

    if (itemsToProcess.length === 0) {
      return createSuccessResult(0, skippedCount, []);
    }

    // 3. 배치 처리 (스크래핑 병렬 + AI 배치 요약)
    const { processedArticles, errors } = await processBatch(itemsToProcess);

    // 4. DB 배치 저장
    if (processedArticles.length > 0) {
      await saveArticlesToDatabase(processedArticles);
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
 * 1단계: Sitemap 조회 및 파싱
 * @private
 */
async function fetchAndParseSitemap(): Promise<NewsArticle[]> {
  console.log("[Workflow] Sitemap 조회 중...");
  const xmlData = await fetchMKSitemap(MK_SITEMAP_URL);
  const newsList = parseMKSitemap(xmlData, ALLOWED_SECTIONS);
  console.log(`[Workflow] ${newsList.length}개 기사 발견`);

  // TODO: 테스트용 - 필요시 주석 해제하여 사용
  // const newsListToProcess = newsList.slice(0, 5);
  // console.log(`[Workflow] [테스트] ${newsListToProcess.length}개만 처리합니다.`);
  // return newsListToProcess;
  return newsList;
}

/**
 * 2단계: 중복 체크 (직렬 처리)
 * @private
 */
async function filterDuplicateArticles(newsList: NewsArticle[]): Promise<{ itemsToProcess: NewsArticle[]; skippedCount: number }> {
  const itemsToProcess: NewsArticle[] = [];

  for (const newsItem of newsList) {
    if (await checkArticleExists(newsItem.url)) {
      console.log(`[Workflow] 기존 기사 발견, 중단: ${newsItem.url}`);
      break;
    }
    itemsToProcess.push(newsItem);
  }

  const skippedCount = newsList.length - itemsToProcess.length;
  console.log(`[Workflow] 중복 체크 완료: ${itemsToProcess.length}개 처리 예정, ${skippedCount}개 스킵`);

  return { itemsToProcess, skippedCount };
}

/**
 * 3단계: 배치 처리 (스크래핑 병렬 + AI 배치 요약)
 * @private
 */
async function processBatch(itemsToProcess: NewsArticle[]): Promise<{ processedArticles: NewsArticle[]; errors: Array<{ url: string; error: string }> }> {
  console.log(`[Workflow] ${itemsToProcess.length}개 기사 배치 처리 시작`);

  const scrapedMap = await scrapeArticles(itemsToProcess);

  if (scrapedMap.size === 0) {
    console.error(`[Workflow] 모든 기사 스크래핑 실패`);
    return {
      processedArticles: [],
      errors: itemsToProcess.map((item) => ({ url: item.url, error: "스크래핑 실패" })),
    };
  }

  const summariesMap = await summarizeScrapedArticles(scrapedMap);

  return addSummariesToArticles(itemsToProcess, scrapedMap, summariesMap);
}

/**
 * 기사 스크래핑 (병렬 처리)
 * @private
 */
async function scrapeArticles(items: NewsArticle[]): Promise<Map<string, ScrapedArticle>> {
  console.log(`[Workflow] 스크래핑 중...`);
  const results = await Promise.allSettled(items.map((item) => scrapeArticle(item.url)));

  const scrapedMap = new Map<string, ScrapedArticle>();
  results.forEach((result, idx) => {
    if (result.status === "fulfilled") {
      scrapedMap.set(items[idx].title, result.value);
    }
  });

  return scrapedMap;
}

/**
 * 스크래핑된 기사 AI 배치 요약
 * @private
 */
async function summarizeScrapedArticles(scrapedMap: Map<string, ScrapedArticle>): Promise<Record<string, string>> {
  console.log(`[Workflow] AI 배치 요약 (${scrapedMap.size}개)...`);
  return await summarizeArticlesBatch(Array.from(scrapedMap.values()));
}

/**
 * 기사 데이터에 요약 추가
 * @private
 */
function addSummariesToArticles(
  items: NewsArticle[],
  scrapedMap: Map<string, ScrapedArticle>,
  summariesMap: Record<string, string>
): { processedArticles: NewsArticle[]; errors: Array<{ url: string; error: string }> } {
  const processedArticles: NewsArticle[] = [];
  const errors: Array<{ url: string; error: string }> = [];

  items.forEach((newsItem) => {
    const summary = summariesMap[newsItem.title];

    if (!summary) {
      const errorType = scrapedMap.has(newsItem.title) ? "AI 요약 실패" : "스크래핑 실패";
      console.warn(`[Workflow] ✗ ${newsItem.title} - ${errorType}`);
      errors.push({ url: newsItem.url, error: errorType });
      return;
    }

    console.log(`[Workflow] ✓ ${newsItem.title}`);
    processedArticles.push({ ...newsItem, summary });
  });

  return { processedArticles, errors };
}

/**
 * 4단계: DB 배치 저장
 * @private
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
 * @private
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
 * @private
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
