/**
 * @fileoverview 기사 개별 처리 로직
 * 스크래핑 + AI 요약 병렬 처리 및 결과 분류
 */

import { NewsArticle } from "@/core/entities/news.entity";
import { scrapeArticle } from "@/core/services/news-scraper.service";
import { summarizeArticle } from "@/core/services/news-summarizer.service";
import { ProcessingResults } from "./types";

/**
 * 단일 그룹 처리 (병렬 스크래핑 + AI 요약)
 */
export async function processArticleGroup(group: NewsArticle[], groupIndex: number, maxConcurrentRequests: number): Promise<ProcessingResults> {
  const startIndex = groupIndex * maxConcurrentRequests + 1;
  const endIndex = startIndex + group.length - 1;

  console.log(`[Workflow] ${startIndex}~${endIndex}번째 기사 처리 중...`);

  const results = await scrapeAndSummarizeArticles(group);
  return classifyResults(results, group);
}

/**
 * 기사 스크래핑 + AI 요약 병렬 처리
 */
async function scrapeAndSummarizeArticles(group: NewsArticle[]): Promise<PromiseSettledResult<{ newsItem: NewsArticle; summary: string | null }>[]> {
  return Promise.allSettled(
    group.map(async (newsItem) => {
      const scrapedArticle = await scrapeArticle(newsItem.url);
      const summary = await summarizeArticle(scrapedArticle);
      return { newsItem, summary };
    })
  );
}

/**
 * 처리 결과를 성공/실패로 분류
 */
function classifyResults(results: PromiseSettledResult<{ newsItem: NewsArticle; summary: string | null }>[], group: NewsArticle[]): ProcessingResults {
  const processedArticles: NewsArticle[] = [];
  const errors: Array<{ url: string; error: string }> = [];

  results.forEach((result, idx) => {
    const newsItem = group[idx];

    if (result.status === "fulfilled") {
      handleFulfilledResult(result.value, processedArticles, errors);
    } else {
      handleRejectedResult(newsItem, result.reason, errors);
    }
  });

  return { processedArticles, errors };
}

/**
 * 성공한 결과 처리
 */
function handleFulfilledResult(value: { newsItem: NewsArticle; summary: string | null }, processedArticles: NewsArticle[], errors: Array<{ url: string; error: string }>): void {
  const { newsItem, summary } = value;

  if (summary !== null) {
    console.log(`[Workflow] ✓ ${newsItem.title}`);
    processedArticles.push({ ...newsItem, summary });
  } else {
    console.warn(`[Workflow] ✗ ${newsItem.title} - AI 요약 실패 (null 반환)`);
    errors.push({ url: newsItem.url, error: "AI 요약 실패" });
  }
}

/**
 * 실패한 결과 처리
 */
function handleRejectedResult(newsItem: NewsArticle, reason: unknown, errors: Array<{ url: string; error: string }>): void {
  const errorMsg = reason instanceof Error ? reason.message : "처리 실패";
  console.warn(`[Workflow] ✗ ${newsItem.title} - ${errorMsg}`);
  errors.push({ url: newsItem.url, error: errorMsg });
}
