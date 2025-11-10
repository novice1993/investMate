import { FinancialStatement, YoYGrowth } from "@/core/entities/financial.entity";
import { fetchMultipleFinancialStatements } from "@/core/infrastructure/financial/dart-financial.infra";
import { getKospiListedCompanies } from "./listed-company.service";

/**
 * 재무 분석 서비스
 * - 재무비율 계산 (ROE, 부채비율, 영업이익률, 순이익률)
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
  corpName: string;
  stockCode?: string;
  year: string;
  quarter: number;

  // 재무제표 원본
  revenue: number;
  operatingProfit: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;

  // YoY 성장률
  revenueYoY: number;
  operatingProfitYoY: number;
  netIncomeYoY: number;

  // 수익성/안전성 지표
  roe: number;
  debtRatio: number;
  operatingMargin: number;
  netMargin: number;
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
 * 수집된 재무 데이터에서 지표를 계산합니다 (순수 함수).
 *
 * @param corpCode 기업 고유번호
 * @param corpName 기업명
 * @param stockCode 종목 코드
 * @param current 현재 분기 재무제표
 * @param previous 전년 동기 재무제표
 * @param previousYearQ4 전년도 연간 재무제표 (Q4가 아닐 때만)
 * @returns 계산된 재무 지표 (실패 시 null)
 */
export function calculateFinancialMetricsFromData(
  corpCode: string,
  corpName: string,
  stockCode: string,
  current: FinancialStatement,
  previous: FinancialStatement,
  previousYearQ4?: FinancialStatement
): FinancialMetrics | null {
  const quarter = current.quarter;
  const quarterCode = getQuarterCode(quarter);

  const metrics = calculateCompanyMetrics(current, previous, previousYearQ4, quarterCode);

  if (!metrics) {
    return null;
  }

  return {
    ...metrics,
    stockCode,
    corpName,
  };
}

/**
 * @deprecated 레거시 함수 - Workflow에서 직접 사용하지 마세요.
 * 대신 getLatestAvailableQuarter + fetchFinancialDataWithFallback + calculateFinancialMetricsFromData 조합 사용
 *
 * KOSPI 전체 기업의 재무 지표를 계산합니다.
 *
 * @param year 조회 연도 (예: "2025")
 * @param quarter 분기 코드 (1분기: "11013", 2분기: "11012", 3분기: "11014", 4분기: "11011")
 * @returns 계산된 지표와 실패 목록
 */
export async function calculateKospiFinancialMetrics(year: string, quarter: "11011" | "11012" | "11013" | "11014"): Promise<BatchMetricsResult> {
  // KOSPI 기업 목록 및 기업명 매핑 준비
  const companies = await getKospiListedCompanies();
  const corpCodes = companies.map((c) => c.company.id);

  // 빠른 기업명 조회를 위한 Map 생성 (O(1) 조회)
  const companyNameMap = new Map(companies.map((c) => [c.company.id, c.company.name]));
  // 빠른 종목코드 조회를 위한 Map 생성 (O(1) 조회)
  const stockCodeMap = new Map(companies.map((c) => [c.company.id, c.company.stockCode]));

  const BATCH_SIZE = 50;
  const success: FinancialMetrics[] = [];
  const failed: string[] = [];
  const unmappedCorpCodes: string[] = [];

  for (let i = 0; i < corpCodes.length; i += BATCH_SIZE) {
    const batch = corpCodes.slice(i, i + BATCH_SIZE);
    const { current, previous, previousYearQ4 } = await fetchBatchFinancialData(batch, year, quarter);

    for (const corpCode of batch) {
      let currentData = current.get(corpCode);
      let previousData = previous.get(corpCode);

      if (!currentData || !previousData) {
        failed.push(corpCode);
        continue;
      }

      // DART Financial API는 stockCode를 반환하지 않으므로, ListedCompany에서 매핑
      const stockCode = stockCodeMap.get(corpCode);
      if (!stockCode) {
        console.warn(`[Financial Analysis] Stock code not found for corpCode: ${corpCode}`);
        failed.push(corpCode);
        continue;
      }

      // stockCode 설정 (DART API 응답에는 없으므로 수동 매핑)
      currentData = { ...currentData, stockCode };
      previousData = { ...previousData, stockCode };

      const metrics = calculateCompanyMetrics(currentData, previousData, previousYearQ4?.get(corpCode), quarter);

      if (metrics) {
        const corpName = companyNameMap.get(corpCode);

        // 기업명 매핑 실패 시 로깅 및 추적
        if (!corpName) {
          console.warn(`[Financial Analysis] Corp name not found for corpCode: ${corpCode}`);
          unmappedCorpCodes.push(corpCode);
          failed.push(corpCode);
          continue;
        }

        success.push({
          ...metrics,
          corpName,
        });
      } else {
        failed.push(corpCode);
      }
    }
  }

  // 매핑 실패 종목 최종 로깅
  if (unmappedCorpCodes.length > 0) {
    console.error(`[Financial Analysis] ${unmappedCorpCodes.length} companies failed corp_name mapping:`, unmappedCorpCodes);
  }

  return { success, failed };
}

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * 분기 번호를 분기 코드로 변환합니다.
 */
function getQuarterCode(quarter: number): "11011" | "11012" | "11013" | "11014" {
  const map: Record<number, "11011" | "11012" | "11013" | "11014"> = {
    1: "11013", // Q1
    2: "11012", // Q2
    3: "11014", // Q3
    4: "11011", // Q4
  };
  return map[quarter];
}

/**
 * TTM 기반 ROE를 계산합니다.
 *
 * @param ttmNetIncome TTM 순이익 (최근 4분기 합계)
 * @param currentEquity 현재 분기 자기자본
 * @param previousEquity 전년 동기 자기자본
 * @returns ROE (%)
 */
function calculateTTMROE(ttmNetIncome: number, currentEquity: number, previousEquity: number): number {
  const avgEquity = (currentEquity + previousEquity) / 2;
  return avgEquity !== 0 ? (ttmNetIncome / avgEquity) * 100 : 0;
}

/**
 * TTM(Trailing Twelve Months) 순이익을 계산합니다.
 *
 * @param current 현재 분기 재무제표
 * @param previous 전년 동기 재무제표
 * @param previousYearQ4 전년도 연간(Q4) 재무제표
 * @param quarter 분기 코드
 * @returns TTM 순이익
 */
function calculateTTMNetIncome(current: FinancialStatement, previous: FinancialStatement, previousYearQ4: FinancialStatement | undefined, quarter: "11011" | "11012" | "11013" | "11014"): number {
  const isQ4 = quarter === "11011";

  if (isQ4) {
    // Q4는 연간 누적 데이터이므로 그대로 사용
    return current.netIncome;
  }

  // Q1~Q3는 전년 연간 - 전년 동기 + 현재 분기로 TTM 계산
  if (!previousYearQ4) {
    throw new Error("Previous year Q4 data required for TTM calculation");
  }

  return previousYearQ4.netIncome - previous.netIncome + current.netIncome;
}

/**
 * 부채비율을 계산합니다.
 *
 * @param totalLiabilities 부채총계
 * @param totalEquity 자본총계
 * @returns 부채비율 (%)
 */
function calculateDebtRatio(totalLiabilities: number, totalEquity: number): number {
  return totalEquity !== 0 ? (totalLiabilities / totalEquity) * 100 : 0;
}

/**
 * 영업이익률을 계산합니다.
 *
 * @param operatingProfit 영업이익
 * @param revenue 매출액
 * @returns 영업이익률 (%)
 */
function calculateOperatingMargin(operatingProfit: number, revenue: number): number {
  return revenue !== 0 ? (operatingProfit / revenue) * 100 : 0;
}

/**
 * 순이익률을 계산합니다.
 *
 * @param netIncome 순이익
 * @param revenue 매출액
 * @returns 순이익률 (%)
 */
function calculateNetMargin(netIncome: number, revenue: number): number {
  return revenue !== 0 ? (netIncome / revenue) * 100 : 0;
}

/**
 * YoY (Year-over-Year) 성장률을 계산합니다.
 *
 * DART API는 누적 데이터를 제공하므로 누적 기준으로 계산합니다.
 * - 예: 2025 Q3 누적(1~3분기) vs 2024 Q3 누적(1~3분기)
 * - 분기별 계절성 영향 제거, 안정적인 성장 트렌드 파악
 * - 증권업계 표준 방식
 *
 * @param current 현재 분기 재무제표 (누적)
 * @param previous 전년 동기 재무제표 (누적)
 * @returns YoY 성장률 (%)
 */
function calculateYoYGrowth(current: FinancialStatement, previous: FinancialStatement): YoYGrowth {
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
 * 배치별 재무 데이터를 조회합니다.
 *
 * @param batch 기업 코드 배열
 * @param year 조회 연도
 * @param quarter 분기 코드
 * @returns 현재/전년 동기/전년 연간 데이터
 */
async function fetchBatchFinancialData(
  batch: string[],
  year: string,
  quarter: "11011" | "11012" | "11013" | "11014"
): Promise<{
  current: Map<string, FinancialStatement>;
  previous: Map<string, FinancialStatement>;
  previousYearQ4: Map<string, FinancialStatement> | undefined;
}> {
  const previousYear = (parseInt(year) - 1).toString();
  const isQ4 = quarter === "11011";

  const fetchPromises = [
    fetchMultipleFinancialStatements(batch, { bsns_year: year, reprt_code: quarter, fs_div: "CFS" }),
    fetchMultipleFinancialStatements(batch, { bsns_year: previousYear, reprt_code: quarter, fs_div: "CFS" }),
  ];

  if (!isQ4) {
    fetchPromises.push(fetchMultipleFinancialStatements(batch, { bsns_year: previousYear, reprt_code: "11011", fs_div: "CFS" }));
  }

  const results = await Promise.all(fetchPromises);

  return {
    current: results[0].data,
    previous: results[1].data,
    previousYearQ4: !isQ4 ? results[2].data : undefined,
  };
}

/**
 * 단일 기업의 재무 지표를 계산합니다.
 *
 * @param current 현재 분기 재무제표
 * @param previous 전년 동기 재무제표
 * @param previousYearQ4 전년도 연간 재무제표
 * @param quarter 분기 코드
 * @returns 계산된 재무 지표 (corpName 제외, 실패 시 null)
 */
function calculateCompanyMetrics(
  current: FinancialStatement,
  previous: FinancialStatement,
  previousYearQ4: FinancialStatement | undefined,
  quarter: "11011" | "11012" | "11013" | "11014"
): Omit<FinancialMetrics, "corpName"> | null {
  try {
    const ttmNetIncome = calculateTTMNetIncome(current, previous, previousYearQ4, quarter);
    const yoy = calculateYoYGrowth(current, previous);
    const roe = calculateTTMROE(ttmNetIncome, current.totalEquity, previous.totalEquity);
    const debtRatio = calculateDebtRatio(current.totalLiabilities, current.totalEquity);
    const operatingMargin = calculateOperatingMargin(current.operatingProfit, current.revenue);
    const netMargin = calculateNetMargin(current.netIncome, current.revenue);

    return {
      corpCode: current.corpCode,
      stockCode: current.stockCode,
      year: current.year,
      quarter: current.quarter,
      revenue: current.revenue,
      operatingProfit: current.operatingProfit,
      netIncome: current.netIncome,
      totalAssets: current.totalAssets,
      totalLiabilities: current.totalLiabilities,
      totalEquity: current.totalEquity,
      revenueYoY: yoy.revenueGrowth,
      operatingProfitYoY: yoy.operatingProfitGrowth,
      netIncomeYoY: yoy.netIncomeGrowth,
      roe,
      debtRatio,
      operatingMargin,
      netMargin,
    };
  } catch {
    return null;
  }
}
