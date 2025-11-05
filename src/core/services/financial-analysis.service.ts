import { FinancialStatement, FinancialRatios, YoYGrowth } from "@/core/entities/financial.entity";
import { fetchMultipleFinancialStatements } from "@/core/infrastructure/financial/dart-financial.infra";
import { getKospiListedCompanies } from "./listed-company.service";

/**
 * 재무 분석 서비스
 * - 재무비율 계산 (ROE, 부채비율, 영업이익률, 순이익률)
 * - 누적 데이터 → 단독 분기 변환
 * - YoY 성장률 계산
 * - KOSPI 기업 배치 지표 계산
 */

// ============================================================================
// Public Types
// ============================================================================

/**
 * 재무 지표 계산 결과
 */
export interface FinancialMetrics {
  corpCode: string;
  stockCode?: string;
  year: string;
  quarter: number;
  revenue: number;
  operatingProfit: number;
  netIncome: number;
  totalEquity: number;
  revenueYoY: number;
  operatingProfitYoY: number;
  netIncomeYoY: number;
  roe: number;
}

/**
 * 배치 계산 결과
 */
export interface BatchMetricsResult {
  success: FinancialMetrics[];
  failed: string[];
}

// ============================================================================
// Public API
// ============================================================================

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

// ============================================================================
// Private Types
// ============================================================================

type QuarterlyStatements = {
  q1?: FinancialStatement;
  q2?: FinancialStatement;
  q3?: FinancialStatement;
  q4?: FinancialStatement;
};

/**
 * 누적 데이터를 단독 분기 실적으로 변환합니다.
 *
 * DART API는 누적 데이터를 제공합니다:
 * - Q1: 1분기 실적 (단독과 동일)
 * - Q2: 1~2분기 누적
 * - Q3: 1~3분기 누적
 * - Q4: 1~4분기 누적 (연간)
 *
 * 변환 결과 (단독 분기):
 * - Q1: 1분기만
 * - Q2: 2분기만 (Q2 누적 - Q1)
 * - Q3: 3분기만 (Q3 누적 - Q2 누적)
 * - Q4: 4분기만 (Q4 누적 - Q3 누적)
 *
 * 사용 예시:
 * - 특정 분기 실적만 집중 분석
 * - 단독 분기 기준 YoY 계산 (선택적)
 * - 분기별 계절성 패턴 분석
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
 * 권장 사용법: 누적 데이터 기준
 * - DART API는 누적 데이터를 제공하므로, 그대로 사용 권장
 * - 예: 2025 Q3 누적(1~3분기) vs 2024 Q3 누적(1~3분기)
 * - 분기별 계절성 영향 제거, 안정적인 성장 트렌드 파악
 * - 증권업계 표준 방식
 *
 * 선택적 사용법: 단독 분기 기준
 * - convertToStandaloneQuarter()로 변환 후 사용 가능
 * - 예: 2025 Q3 단독 vs 2024 Q3 단독
 * - 특정 분기 실적만 집중 분석할 때 사용
 *
 * @param current 현재 분기 재무제표 (누적 또는 단독)
 * @param previous 전년 동기 재무제표 (누적 또는 단독)
 * @returns YoY 성장률 (%)
 */
export function calculateYoYGrowth(current: FinancialStatement, previous: FinancialStatement): YoYGrowth {
  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  return {
    revenueGrowth: calculateGrowth(current.revenue, previous.revenue),
    operatingProfitGrowth: calculateGrowth(current.operatingProfit, previous.operatingProfit),
    netIncomeGrowth: calculateGrowth(current.netIncome, previous.netIncome),
  };
}

/**
 * KOSPI 전체 기업의 재무 지표를 계산합니다.
 *
 * @param year 조회 연도 (예: "2025")
 * @param quarter 분기 코드 (1분기: "11013", 2분기: "11012", 3분기: "11014", 4분기: "11011")
 * @returns 계산된 지표와 실패 목록
 */
export async function calculateKospiFinancialMetrics(year: string, quarter: "11011" | "11012" | "11013" | "11014"): Promise<BatchMetricsResult> {
  // 1. KOSPI 기업 목록 조회
  const companies = await getKospiListedCompanies();
  const corpCodes = companies.map((c) => c.company.id);

  // 2. 100개씩 배치 처리
  const BATCH_SIZE = 100;
  const success: FinancialMetrics[] = [];
  const failed: string[] = [];

  const previousYear = (parseInt(year) - 1).toString();

  for (let i = 0; i < corpCodes.length; i += BATCH_SIZE) {
    const batch = corpCodes.slice(i, i + BATCH_SIZE);

    // 현재 & 전년 동기 데이터 병렬 조회
    const [currentResult, previousResult] = await Promise.all([
      fetchMultipleFinancialStatements(batch, { bsns_year: year, reprt_code: quarter, fs_div: "CFS" }),
      fetchMultipleFinancialStatements(batch, { bsns_year: previousYear, reprt_code: quarter, fs_div: "CFS" }),
    ]);

    // 각 기업별 지표 계산
    for (const corpCode of batch) {
      const current = currentResult.data.get(corpCode);
      const previous = previousResult.data.get(corpCode);

      if (!current || !previous) {
        failed.push(corpCode);
        continue;
      }

      const yoy = calculateYoYGrowth(current, previous);
      const roe = calculateTTMROE(current.netIncome, current.totalEquity, previous.totalEquity);

      success.push({
        corpCode,
        stockCode: current.stockCode,
        year: current.year,
        quarter: current.quarter,
        revenue: current.revenue,
        operatingProfit: current.operatingProfit,
        netIncome: current.netIncome,
        totalEquity: current.totalEquity,
        revenueYoY: yoy.revenueGrowth,
        operatingProfitYoY: yoy.operatingProfitGrowth,
        netIncomeYoY: yoy.netIncomeGrowth,
        roe,
      });
    }
  }

  return { success, failed };
}
