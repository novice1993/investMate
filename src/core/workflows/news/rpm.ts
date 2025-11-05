/**
 * @fileoverview RPM (Requests Per Minute) 제한 관리
 * Gemini 2.5 Flash-Lite API의 RPM 15 제한을 고려한 요청 제어
 */

import { NewsArticle } from "@/core/entities/news.entity";
import { processArticleGroup } from "./processor";
import { RPMState, ProcessingResults } from "./types";

// RPM 제한 설정
const MAX_CONCURRENT_REQUESTS = 5; // 한 번에 최대 5개씩 병렬 처리
const RPM_LIMIT = 15; // Gemini 2.5 Flash-Lite RPM 제한
const SAFE_WINDOW_MS = 80000; // 60초 + 20초 안전 여유

// ============================================================================
// Public API
// ============================================================================

/**
 * RPM 상태 초기화
 */
export function createRPMState(): RPMState {
  return {
    requestCount: 0,
    windowStartTime: Date.now(),
  };
}

/**
 * 배열을 지정된 크기의 그룹으로 분할
 */
export function splitIntoGroups<T>(items: T[], groupSize: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += groupSize) {
    groups.push(items.slice(i, i + groupSize));
  }
  return groups;
}

/**
 * RPM 제한을 고려하여 그룹들을 순차 처리
 */
export async function processGroupsWithRPMLimit(groups: NewsArticle[][], rpmState: RPMState): Promise<ProcessingResults> {
  const processedArticles: NewsArticle[] = [];
  const errors: Array<{ url: string; error: string }> = [];

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];

    // RPM 초과 시 대기
    await waitIfRPMExceeded(rpmState, group.length);

    // 그룹 처리
    const groupResults = await processArticleGroup(group, i, MAX_CONCURRENT_REQUESTS);

    // 결과 수집
    processedArticles.push(...groupResults.processedArticles);
    errors.push(...groupResults.errors);

    // RPM 카운터 증가
    rpmState.requestCount += group.length;
  }

  return { processedArticles, errors };
}

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * RPM 초과 여부 확인 및 대기
 */
async function waitIfRPMExceeded(rpmState: RPMState, groupSize: number): Promise<void> {
  if (shouldWaitForRPM(rpmState.requestCount, groupSize)) {
    await waitForRPMWindow(rpmState);
    resetRPMState(rpmState);
  }
}

/**
 * RPM 대기 필요 여부 확인
 */
function shouldWaitForRPM(currentCount: number, groupSize: number): boolean {
  return currentCount + groupSize > RPM_LIMIT;
}

/**
 * RPM 윈도우 대기
 */
async function waitForRPMWindow(rpmState: RPMState): Promise<void> {
  const elapsedTime = Date.now() - rpmState.windowStartTime;

  if (elapsedTime < SAFE_WINDOW_MS) {
    const waitTime = SAFE_WINDOW_MS - elapsedTime;
    console.log(`[Workflow] RPM 제한 (${rpmState.requestCount}/${RPM_LIMIT}): ${Math.round(waitTime / 1000)}초 대기 중...`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
}

/**
 * RPM 상태 리셋
 */
function resetRPMState(rpmState: RPMState): void {
  rpmState.requestCount = 0;
  rpmState.windowStartTime = Date.now();
}
