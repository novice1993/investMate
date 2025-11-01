import { FinancialStatement, FinancialRatios, YoYGrowth } from "@/core/entities/financial.entity";

/**
 * 재무 분석 서비스
 * - 재무비율 계산 (ROE, 부채비율, 영업이익률, 순이익률)
 * - 누적 데이터 → 단독 분기 변환
 * - YoY 성장률 계산
 */

/**
 * TTM 기반 ROE를 계산합니다.
 *
 * @param ttmNetIncome TTM 순이익 (최근 4분기 합계)
 * @param currentEquity 현재 분기 자기자본
 * @param previousEquity 전년 동기 자기자본
 * @returns ROE (%)
 */
export function calculateTTMROE(ttmNetIncome: number, currentEquity: number, previousEquity: number): number {
  const avgEquity = (currentEquity + previousEquity) / 2;
  return avgEquity !== 0 ? (ttmNetIncome / avgEquity) * 100 : 0;
}

/**
 * 재무제표로부터 기본 재무 비율을 계산합니다.
 * (부채비율, 영업이익률, 순이익률)
 *
 * @param statement 재무제표 엔티티
 * @param corpName 기업명
 * @returns 계산된 재무 비율 (ROE 제외)
 */
export function calculateFinancialRatios(statement: FinancialStatement, corpName: string): FinancialRatios {
  const { corpCode, stockCode = "", year, quarter, totalEquity, totalLiabilities, revenue, operatingProfit, netIncome } = statement;

  // 부채비율 = (부채총계 / 자본총계) × 100
  const debtRatio = totalEquity !== 0 ? (totalLiabilities / totalEquity) * 100 : 0;

  // 영업이익률 = (영업이익 / 매출액) × 100
  const operatingMargin = revenue !== 0 ? (operatingProfit / revenue) * 100 : 0;

  // 순이익률 = (당기순이익 / 매출액) × 100
  const netMargin = revenue !== 0 ? (netIncome / revenue) * 100 : 0;

  return {
    corpCode,
    stockCode,
    corpName,
    year,
    quarter,
    roe: 0, // TTM 계산 필요
    debtRatio,
    operatingMargin,
    netMargin,
  };
}

type QuarterlyStatements = {
  q1?: FinancialStatement;
  q2?: FinancialStatement;
  q3?: FinancialStatement;
  q4?: FinancialStatement;
};

/**
 * 누적 데이터를 단독 분기 실적으로 변환합니다.
 *
 * DART API는 누적 데이터만 제공하므로, 단독 분기 실적을 계산해야 합니다.
 * - Q1: 그대로 사용
 * - Q2: 반기누적 - Q1
 * - Q3: 3분기누적 - 반기누적
 * - Q4: 연간누적 - 3분기누적
 *
 * @param cumulative 누적 재무제표 (같은 연도의 Q1, Q2, Q3, Q4)
 * @returns 단독 분기 실적
 */
export function convertToStandaloneQuarter(cumulative: QuarterlyStatements): QuarterlyStatements {
  const result: QuarterlyStatements = {};

  // Q1: 그대로 사용
  if (cumulative.q1) {
    result.q1 = cumulative.q1;
  }

  // Q2: 반기누적 - Q1
  if (cumulative.q2 && cumulative.q1) {
    result.q2 = {
      ...cumulative.q2,
      revenue: cumulative.q2.revenue - cumulative.q1.revenue,
      operatingProfit: cumulative.q2.operatingProfit - cumulative.q1.operatingProfit,
      netIncome: cumulative.q2.netIncome - cumulative.q1.netIncome,
    };
  }

  // Q3: 3분기누적 - 반기누적
  if (cumulative.q3 && cumulative.q2) {
    result.q3 = {
      ...cumulative.q3,
      revenue: cumulative.q3.revenue - cumulative.q2.revenue,
      operatingProfit: cumulative.q3.operatingProfit - cumulative.q2.operatingProfit,
      netIncome: cumulative.q3.netIncome - cumulative.q2.netIncome,
    };
  }

  // Q4: 연간누적 - 3분기누적
  if (cumulative.q4 && cumulative.q3) {
    result.q4 = {
      ...cumulative.q4,
      revenue: cumulative.q4.revenue - cumulative.q3.revenue,
      operatingProfit: cumulative.q4.operatingProfit - cumulative.q3.operatingProfit,
      netIncome: cumulative.q4.netIncome - cumulative.q3.netIncome,
    };
  }

  return result;
}

/**
 * YoY (Year-over-Year) 성장률을 계산합니다.
 *
 * 주의: 단독 분기 실적을 사용해야 정확한 YoY를 계산할 수 있습니다.
 *
 * @param currentStandalone 현재 단독 분기 실적
 * @param previousStandalone 전년 동기 단독 분기 실적
 * @returns YoY 성장률 (%)
 */
export function calculateYoYGrowth(currentStandalone: FinancialStatement, previousStandalone: FinancialStatement): YoYGrowth {
  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  return {
    revenueGrowth: calculateGrowth(currentStandalone.revenue, previousStandalone.revenue),
    operatingProfitGrowth: calculateGrowth(currentStandalone.operatingProfit, previousStandalone.operatingProfit),
    netIncomeGrowth: calculateGrowth(currentStandalone.netIncome, previousStandalone.netIncome),
  };
}
