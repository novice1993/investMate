/**
 * @fileoverview 재무 데이터 날짜/분기 유틸리티
 *
 * 분기 계산 관련 공통 함수를 제공합니다.
 */

/**
 * 월(month)을 분기 번호로 변환합니다.
 *
 * @param month 월 (1-12)
 * @returns 분기 번호 (1-4)
 */
export function getQuarterFromMonth(month: number): number {
  if (month >= 1 && month <= 3) return 1;
  if (month >= 4 && month <= 6) return 2;
  if (month >= 7 && month <= 9) return 3;
  return 4;
}

/**
 * 현재 분기의 이전 분기 연도와 번호를 계산합니다.
 *
 * @param currentYear 현재 연도
 * @param currentQuarter 현재 분기 번호 (1-4)
 * @returns 이전 분기 연도 및 번호
 */
export function getPreviousQuarter(currentYear: number, currentQuarter: number): { year: number; quarter: number } {
  if (currentQuarter === 1) {
    return { year: currentYear - 1, quarter: 4 };
  }
  return { year: currentYear, quarter: currentQuarter - 1 };
}

/**
 * 현재 날짜 기준 최신 확정 분기를 반환합니다.
 *
 * 전략: 현재 속한 분기의 이전 분기 (공시 지연 고려)
 *
 * @returns { year, quarter } - 최신 확정 분기
 */
export function getLatestConfirmedQuarter(): { year: number; quarter: number } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = getQuarterFromMonth(now.getMonth() + 1);

  return getPreviousQuarter(currentYear, currentQuarter);
}
