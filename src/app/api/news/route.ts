import { NextRequest, NextResponse } from "next/server";
import { News } from "@/core/entities/news.entity";
import { fetchRSSFeed } from "@/core/infrastructure/news.infra";
import { parseRSSFeed } from "@/core/services/news.service";
import { getActiveRSSSources, RSSSource } from "./config/sources";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const activeSources = getActiveRSSSources();
    const filteredSources = filterRSSSourcesFromQuery(activeSources, searchParams);

    const results = await processMultipleRSSSources(filteredSources);
    const { allNews, errors } = separateNewsAndErrors(results, filteredSources);

    const sortedNews = sortNewsByDate(allNews);

    return createSuccessResponse(sortedNews, filteredSources, errors);
  } catch (error) {
    return createErrorResponse(error);
  }
}

// 요청 파라미터 파싱 및 소스 필터링 (통합)
function filterRSSSourcesFromQuery(sources: RSSSource[], searchParams: URLSearchParams): RSSSource[] {
  const sourceParam = searchParams.get("source");

  if (!sourceParam) {
    return sources; // 파라미터 없으면 전체 소스 반환
  }

  // 콤마로 분리하여 배열로 변환 (단일값도 배열로 처리)
  const requestedSourceIds = sourceParam.split(",").map((id) => id.trim());

  // config 배열에서 요청된 ID들과 매칭되는 소스만 필터링
  return sources.filter((source) => requestedSourceIds.includes(source.id));
}

// 단일 RSS 소스 처리
async function processRSSSource(source: RSSSource) {
  const xmlData = await fetchRSSFeed(source.url);
  const news = await parseRSSFeed(xmlData, source.name);
  return { source: source.id, news };
}

// 여러 RSS 소스 병렬 처리
async function processMultipleRSSSources(sources: RSSSource[]) {
  return await Promise.allSettled(sources.map(processRSSSource));
}

// 처리 결과에서 뉴스와 에러 분리
function separateNewsAndErrors(results: PromiseSettledResult<{ source: string; news: News[] }>[], sources: RSSSource[]) {
  const allNews: News[] = [];
  const errors: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      allNews.push(...result.value.news);
    } else {
      errors.push(`${sources[index].name}: ${result.reason}`);
    }
  });

  return { allNews, errors };
}

// 뉴스 정렬 (최신순)
function sortNewsByDate(news: News[]): News[] {
  return news.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

// 성공 응답 생성
function createSuccessResponse(news: News[], sources: RSSSource[], errors: string[]) {
  return NextResponse.json({
    data: news,
    sources: sources.map((s) => s.name),
    errors: errors.length > 0 ? errors : undefined,
  });
}

// 에러 응답 생성
function createErrorResponse(error: unknown) {
  console.error(`[api/news] RSS 처리 실패:`, error);
  const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
  return NextResponse.json({ error: message }, { status: 500 });
}
