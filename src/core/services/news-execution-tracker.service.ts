import { getCached, setCache } from "@/shared/lib/utils/cache";

/**
 * 뉴스 수집 워크플로우 실행 시간 추적 서비스
 */

const LAST_RUN_TIME_KEY = "news-collection-last-run-time";

/**
 * 마지막 실행 시간을 조회합니다.
 * @returns 마지막 실행 시간 (ISO string) 또는 null (첫 실행)
 */
export function getLastRunTime(): string | null {
  return getCached<string>(LAST_RUN_TIME_KEY);
}

/**
 * 현재 시간을 마지막 실행 시간으로 저장합니다.
 */
export function updateLastRunTime(): void {
  const now = new Date().toISOString();
  setCache(LAST_RUN_TIME_KEY, now);
  console.log(`[Execution Tracker] 마지막 실행 시간 업데이트: ${now}`);
}

/**
 * 서버 시작 시 마지막 실행 시간을 초기화합니다.
 * 이미 값이 있으면 유지, 없으면 현재 시간으로 설정
 */
export function initializeLastRunTime(): void {
  const existingTime = getLastRunTime();

  if (existingTime) {
    console.log(`[Execution Tracker] 기존 마지막 실행 시간 유지: ${existingTime}`);
  } else {
    const now = new Date().toISOString();
    setCache(LAST_RUN_TIME_KEY, now);
    console.log(`[Execution Tracker] 서버 시작 - 마지막 실행 시간 초기화: ${now}`);
  }
}

/**
 * 마지막 실행 시간 이후의 기사만 필터링합니다.
 * @param articles 전체 기사 배열
 * @param lastRunTime 마지막 실행 시간 (ISO string)
 * @returns 필터링된 기사 배열
 */
export function filterArticlesSinceLastRun<T extends { published_at: string }>(articles: T[], lastRunTime: string | null): T[] {
  // 첫 실행인 경우 모든 기사 반환
  if (!lastRunTime) {
    console.log("[Execution Tracker] 첫 실행 - 모든 기사 처리");
    return articles;
  }

  const lastRunDate = new Date(lastRunTime);
  const filtered = articles.filter((article) => {
    const publishedDate = new Date(article.published_at);
    return publishedDate > lastRunDate;
  });

  console.log(`[Execution Tracker] 마지막 실행(${lastRunTime}) 이후 기사: ${filtered.length}/${articles.length}개`);
  return filtered;
}
