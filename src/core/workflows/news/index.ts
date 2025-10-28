/**
 * @fileoverview 뉴스 수집 워크플로우
 * sitemap 조회 → 중복 체크 → 스크래핑 → AI 개별 요약 → 배치 저장
 */

import { NewsArticle } from "@/core/entities/news.entity";
import { fetchMKSitemap } from "@/core/infrastructure/news.infra";
import { parseMKSitemap, checkArticleExists, insertNewsArticles } from "@/core/services/news.service";
import { createRPMState, splitIntoGroups, processGroupsWithRPMLimit } from "./rpm";
import { NewsCollectionResult } from "./types";

const MK_SITEMAP_URL = "https://www.mk.co.kr/sitemap/latest-articles";
const ALLOWED_SECTIONS = ["economy", "business", "realestate", "stock", "it", "politics"];
const MAX_CONCURRENT_REQUESTS = 5;

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
 * 4. 새 기사는 병렬로 스크래핑 + AI 개별 요약 (각 기사마다 독립적 처리)
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

    // 3. 개별 처리 (스크래핑 병렬 + AI 개별 요약)
    const { processedArticles, errors } = await processArticles(itemsToProcess);

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
 * 3단계: 개별 처리 (스크래핑 병렬 + AI 개별 요약)
 * RPM 제한을 고려하여 5개씩 그룹으로 나눠 처리
 */
async function processArticles(itemsToProcess: NewsArticle[]): Promise<{ processedArticles: NewsArticle[]; errors: Array<{ url: string; error: string }> }> {
  console.log(`[Workflow] ${itemsToProcess.length}개 기사 개별 처리 시작`);

  const groups = splitIntoGroups(itemsToProcess, MAX_CONCURRENT_REQUESTS);
  const rpmState = createRPMState();

  const allResults = await processGroupsWithRPMLimit(groups, rpmState);

  console.log(`[Workflow] 처리 완료: 성공 ${allResults.processedArticles.length}개, 실패 ${allResults.errors.length}개`);

  return allResults;
}

/**
 * 4단계: DB 배치 저장
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
