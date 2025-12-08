/**
 * @fileoverview 재무 데이터 조회 전략 서비스
 *
 * 책임:
 * - 수집 대상 분기 결정 전략
 * - Fallback 조회 전략 (실패 시 이전 분기 재시도)
 */

import { FinancialStatement } from "@/core/entities/financial.entity";
import { fetchMultipleFinancialStatements } from "@/core/infrastructure/financial/dart-financial.infra";
import { getQuarterFromMonth, getPreviousQuarter } from "@/core/services/financial-date.util";

// ============================================================================
// Constants
// ============================================================================

/**
 * DART API 분기 코드 매핑
 */
const QUARTER_CODE_MAP: Record<number, QuarterCode> = {
  1: "11013", // Q1
  2: "11012", // Q2
  3: "11014", // Q3
  4: "11011", // Q4
};

/**
 * 이전 분기 코드 매핑
 */
const PREVIOUS_QUARTER_MAP: Record<QuarterCode, QuarterCode> = {
  "11013": "11011", // Q1 → Q4
  "11012": "11013", // Q2 → Q1
  "11014": "11012", // Q3 → Q2
  "11011": "11014", // Q4 → Q3
};

/**
 * Q4 분기 코드
 */
const Q4_CODE: QuarterCode = "11011";

// ============================================================================
// Public Types
// ============================================================================

/**
 * 분기 코드 타입
 */
export type QuarterCode = "11011" | "11012" | "11013" | "11014";

/**
 * 재무 데이터 조회 결과
 */
export interface FinancialDataQueryResult {
  current: Map<string, FinancialStatement>;
  previous: Map<string, FinancialStatement>;
  previousYearQ4?: Map<string, FinancialStatement>;
  failed: string[];
}

// ============================================================================
// Public API
// ============================================================================

/**
 * 현재 시점에서 수집 가능한 최신 분기를 반환합니다.
 *
 * 전략:
 * - 현재 속한 분기의 이전 분기 데이터 수집
 * - 공시 지연을 고려하여 안정적인 데이터 확보
 *
 * @returns { year, quarter } - 수집 대상 연도 및 분기 코드
 */
export function getLatestAvailableQuarter(): {
  year: string;
  quarter: QuarterCode;
} {
  const now = new Date();
  const currentYear = now.getFullYear();
  const month = now.getMonth() + 1;

  // 현재 분기 계산
  const currentQuarter = getQuarterFromMonth(month);

  // 이전 분기 계산 (Q1의 이전은 전년도 Q4)
  const { year: targetYear, quarter: targetQuarterNum } = getPreviousQuarter(currentYear, currentQuarter);

  // 분기 번호 → DART 분기 코드 변환
  const quarterCode = QUARTER_CODE_MAP[targetQuarterNum];

  return {
    year: targetYear.toString(),
    quarter: quarterCode,
  };
}

/**
 * Fallback 전략을 포함하여 재무 데이터를 조회합니다.
 *
 * 전략:
 * 1. 지정된 분기 데이터 조회 (current, previous, previousYearQ4)
 * 2. current 실패 시 → 이전 분기로 Fallback
 * 3. 여전히 실패한 기업은 failed 목록에 포함
 *
 * @param corpCodes 조회할 기업 고유번호 배열
 * @param year 조회 연도
 * @param quarter 분기 코드
 * @returns 조회된 재무 데이터 (current, previous, previousYearQ4, failed)
 */
export async function fetchFinancialDataWithFallback(corpCodes: string[], year: string, quarter: QuarterCode): Promise<FinancialDataQueryResult> {
  const previousYear = (parseInt(year) - 1).toString();

  // 1차 시도: 목표 분기 데이터 조회
  console.log(`\n[1차 시도] 목표 분기 데이터 조회 (${year} Q${quarter})`);
  const initialResults = await fetchInitialFinancialData(corpCodes, year, previousYear, quarter);

  // 실패한 기업 식별 (current, previous, previousYearQ4 중 하나라도 없으면 실패)
  const failedCorpCodes = identifyFailedCorpCodes(corpCodes, initialResults, quarter);

  if (failedCorpCodes.length > 0) {
    console.log(`\n[Fallback] ${failedCorpCodes.length}개 기업 이전 분기로 재시도`);
  }

  // 2차 시도: 실패한 기업만 이전 분기로 Fallback
  const fallbackResults = await retryFailedCompaniesWithFallback(failedCorpCodes, year, previousYear, quarter);

  // 결과 병합: 1차 성공 + 2차 성공 (1차에서 성공한 기업은 재조회 안됨)
  const mergedCurrent = new Map([...initialResults.currentResult.data, ...fallbackResults.current]);
  const mergedPrevious = new Map([...initialResults.previousResult.data, ...fallbackResults.previous]);
  const mergedPrevYearQ4 = new Map([...initialResults.prevYearQ4Result.data, ...fallbackResults.previousYearQ4]);

  return {
    current: mergedCurrent,
    previous: mergedPrevious,
    previousYearQ4: mergedPrevYearQ4,
    failed: fallbackResults.missing,
  };
}

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * 초기 재무 데이터를 조회합니다 (current, previous, previousYearQ4).
 *
 * @param corpCodes 조회할 기업 고유번호 배열
 * @param year 조회 연도
 * @param previousYear 전년도
 * @param quarter 분기 코드
 * @returns 조회 결과
 */
async function fetchInitialFinancialData(
  corpCodes: string[],
  year: string,
  previousYear: string,
  quarter: QuarterCode
): Promise<{
  currentResult: { data: Map<string, FinancialStatement>; missing: string[] };
  previousResult: { data: Map<string, FinancialStatement>; missing: string[] };
  prevYearQ4Result: { data: Map<string, FinancialStatement>; missing: string[] };
}> {
  const isQ4 = quarter === Q4_CODE;

  const [currentResult, previousResult, prevYearQ4Result] = await Promise.all([
    fetchMultipleFinancialStatements(corpCodes, { bsns_year: year, reprt_code: quarter, fs_div: "CFS" }),
    fetchMultipleFinancialStatements(corpCodes, { bsns_year: previousYear, reprt_code: quarter, fs_div: "CFS" }),
    // Q4가 아닐 경우에만 전년도 Q4 데이터 조회 (TTM 계산용)
    !isQ4
      ? fetchMultipleFinancialStatements(corpCodes, { bsns_year: previousYear, reprt_code: Q4_CODE, fs_div: "CFS" })
      : Promise.resolve({ data: new Map<string, FinancialStatement>(), missing: [] }),
  ]);

  console.log(`  [current] ${year} ${quarter}: ${currentResult.data.size}/${corpCodes.length} success, ${currentResult.missing.length} missing`);
  console.log(`  [previous] ${previousYear} ${quarter}: ${previousResult.data.size}/${corpCodes.length} success, ${previousResult.missing.length} missing`);
  if (!isQ4) {
    console.log(`  [previousYearQ4] ${previousYear} Q4: ${prevYearQ4Result.data.size}/${corpCodes.length} success, ${prevYearQ4Result.missing.length} missing`);
  }

  return { currentResult, previousResult, prevYearQ4Result };
}

/**
 * 재무 데이터 조회 실패 기업을 식별합니다.
 *
 * current, previous, previousYearQ4 중 하나라도 없으면 실패로 판단합니다.
 *
 * @param corpCodes 전체 기업 코드 배열
 * @param results 초기 조회 결과
 * @param quarter 조회 분기 코드
 * @returns 실패한 기업 코드 배열
 */
function identifyFailedCorpCodes(
  corpCodes: string[],
  results: {
    currentResult: { data: Map<string, FinancialStatement>; missing: string[] };
    previousResult: { data: Map<string, FinancialStatement>; missing: string[] };
    prevYearQ4Result: { data: Map<string, FinancialStatement>; missing: string[] };
  },
  quarter: QuarterCode
): string[] {
  return corpCodes.filter((corpCode) => {
    const hasCurrent = results.currentResult.data.has(corpCode);
    const hasPrevious = results.previousResult.data.has(corpCode);
    const hasPrevYearQ4 = quarter === Q4_CODE || results.prevYearQ4Result.data.has(corpCode);

    // 하나라도 없으면 실패
    return !hasCurrent || !hasPrevious || !hasPrevYearQ4;
  });
}

/**
 * 실패한 기업들을 이전 분기로 재시도합니다.
 *
 * @param failedCorpCodes 실패한 기업 코드 배열
 * @param year 조회 연도
 * @param previousYear 전년도
 * @param quarter 분기 코드
 * @returns Fallback 조회 결과 (current, previous, previousYearQ4, missing)
 */
async function retryFailedCompaniesWithFallback(
  failedCorpCodes: string[],
  year: string,
  previousYear: string,
  quarter: QuarterCode
): Promise<{
  current: Map<string, FinancialStatement>;
  previous: Map<string, FinancialStatement>;
  previousYearQ4: Map<string, FinancialStatement>;
  missing: string[];
}> {
  if (failedCorpCodes.length === 0) {
    return {
      current: new Map<string, FinancialStatement>(),
      previous: new Map<string, FinancialStatement>(),
      previousYearQ4: new Map<string, FinancialStatement>(),
      missing: [],
    };
  }

  const prevQuarter = PREVIOUS_QUARTER_MAP[quarter];
  const fallbackYear = prevQuarter === Q4_CODE ? previousYear : year;
  const fallbackPreviousYear = (parseInt(fallbackYear) - 1).toString();

  const fallbackResults = await fetchInitialFinancialData(failedCorpCodes, fallbackYear, fallbackPreviousYear, prevQuarter);

  // 여전히 실패한 기업 경고
  if (fallbackResults.currentResult.missing.length > 0) {
    console.warn(`[Query Strategy] ${fallbackResults.currentResult.missing.length} companies failed after fallback`);
  }

  return {
    current: fallbackResults.currentResult.data,
    previous: fallbackResults.previousResult.data,
    previousYearQ4: fallbackResults.prevYearQ4Result.data,
    missing: fallbackResults.currentResult.missing,
  };
}
