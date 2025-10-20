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
const GEMINI_MAX_RPM = 10; // Gemini API Free Tier RPM 제한
const CONCURRENT_LIMIT = 5; // 병렬 처리 개수

export interface NewsCollectionResult {
  success: boolean;
  collectedCount: number;
  skippedCount: number;
  errors: Array<{ url: string; error: string }>;
  message: string;
}

interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: Date;
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
 * 4. 새 기사는 5개씩 병렬로 스크래핑 + AI 요약 후 메모리에 누적
 * 5. 모든 새 기사를 한 번에 DB에 저장 (API 요청 최소화)
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

    // 3. 병렬 처리 (5개씩, RPM 제한 고려)
    const { processedArticles, errors } = await processArticlesInParallel(itemsToProcess);

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
async function fetchAndParseSitemap(): Promise<NewsItem[]> {
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
async function filterDuplicateArticles(newsList: NewsItem[]): Promise<{ itemsToProcess: NewsItem[]; skippedCount: number }> {
  const itemsToProcess: NewsItem[] = [];

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
 * 3단계: 병렬 처리 (5개씩, RPM 제한 고려)
 * @private
 */
async function processArticlesInParallel(itemsToProcess: NewsItem[]): Promise<{ processedArticles: NewsArticle[]; errors: Array<{ url: string; error: string }> }> {
  const processedArticles: NewsArticle[] = [];
  const errors: Array<{ url: string; error: string }> = [];

  let processedInMinute = 0;
  let minuteStartTime = Date.now();

  for (let i = 0; i < itemsToProcess.length; i += CONCURRENT_LIMIT) {
    const chunk = itemsToProcess.slice(i, i + CONCURRENT_LIMIT);

    // RPM 제한 체크 및 대기
    ({ processedInMinute, minuteStartTime } = await waitForRPMLimitIfNeeded(processedInMinute, minuteStartTime, chunk.length));

    // 청크 병렬 처리
    const chunkResults = await processChunk(chunk, i, itemsToProcess.length);

    // 결과 수집
    chunkResults.forEach((result) => {
      if (result.success) {
        processedArticles.push(result.article!);
      } else {
        errors.push({ url: result.url, error: result.error! });
      }
    });

    processedInMinute += chunk.length;
  }

  return { processedArticles, errors };
}

/**
 * RPM 제한 체크 및 필요 시 대기
 * @private
 */
async function waitForRPMLimitIfNeeded(processedInMinute: number, minuteStartTime: number, chunkSize: number): Promise<{ processedInMinute: number; minuteStartTime: number }> {
  const now = Date.now();
  const elapsedSeconds = (now - minuteStartTime) / 1000;

  // 1분 경과했으면 카운터 리셋
  if (elapsedSeconds >= 60) {
    return { processedInMinute: 0, minuteStartTime: now };
  }

  // 이번 청크 처리 시 RPM 초과 시 대기
  if (processedInMinute + chunkSize > GEMINI_MAX_RPM) {
    const waitSeconds = Math.ceil(60 - elapsedSeconds);
    console.log(`[Workflow] RPM 제한 (${GEMINI_MAX_RPM}/min) - ${waitSeconds}초 대기 중...`);
    await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
    return { processedInMinute: 0, minuteStartTime: Date.now() };
  }

  return { processedInMinute, minuteStartTime };
}

/**
 * 청크 단위 병렬 처리
 * @private
 */
async function processChunk(chunk: NewsItem[], startIndex: number, totalCount: number): Promise<Array<{ success: boolean; article?: NewsArticle; url: string; error?: string }>> {
  const chunkStart = startIndex + 1;
  const chunkEnd = Math.min(startIndex + chunk.length, totalCount);

  console.log(`[Workflow] ${chunk.length}개 기사 병렬 처리 중... (${chunkStart}~${chunkEnd}/${totalCount})`);

  const results = await Promise.allSettled(chunk.map((item) => processNewsItem(item)));

  return results.map((result, idx) => {
    if (result.status === "fulfilled") {
      console.log(`[Workflow] ✓ ${chunk[idx].title}`);
      return { success: true, article: result.value, url: chunk[idx].url };
    } else {
      const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason);
      console.error(`[Workflow] ✗ ${chunk[idx].title} 실패:`, errorMessage);
      return { success: false, url: chunk[idx].url, error: errorMessage };
    }
  });
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

/**
 * 단일 뉴스 기사를 처리하여 DB 저장 형식으로 변환
 * @private
 */
async function processNewsItem(newsItem: NewsItem): Promise<NewsArticle> {
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
