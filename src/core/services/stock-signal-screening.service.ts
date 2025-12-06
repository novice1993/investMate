/**
 * @fileoverview 종목 스크리닝 서비스
 *
 * 펀더멘털 + 밸류에이션 지표를 기반으로 Top N 종목을 선별합니다.
 */

import type { KospiCorpMapping } from "@/core/infrastructure/financial/dart-stream.infra";

// ============================================================================
// Types
// ============================================================================

export interface FundamentalConfig {
  minROE: number; // 최소 ROE (%)
  maxDebtRatio: number; // 최대 부채비율 (%)
  minOperatingMargin: number; // 최소 영업이익률 (%)
  maxPER: number | null; // 최대 PER (null이면 필터 비활성화)
  maxPBR: number | null; // 최대 PBR (null이면 필터 비활성화)
}

export interface ScreeningConfig {
  fundamental: FundamentalConfig;
  topN: number; // 반환할 종목 수
}

/**
 * 재무 지표 데이터 (Supabase에서 조회)
 */
export interface FinancialMetrics {
  corpCode: string;
  stockCode: string;
  corpName: string;
  roe: number;
  debtRatio: number;
  operatingMargin: number;
}

/**
 * 스크리닝된 종목 결과
 */
export interface ScreenedStock {
  stockCode: string;
  corpName: string;
  corpCode: string;
  marketCap: number;

  // 펀더멘털 지표
  roe: number;
  debtRatio: number;
  operatingMargin: number;
}

// ============================================================================
// Config
// ============================================================================

export const SCREENING_CONFIG: ScreeningConfig = {
  fundamental: {
    minROE: 5,
    maxDebtRatio: 200,
    minOperatingMargin: 3,
    maxPER: 30,
    maxPBR: 3.0,
  },
  topN: 40,
};

// ============================================================================
// Filtering Logic
// ============================================================================

/**
 * 펀더멘털 조건을 평가합니다.
 */
function evaluateFundamental(metrics: FinancialMetrics, config: ScreeningConfig, valuation?: { per: number | null; pbr: number | null }): boolean {
  const { minROE, maxDebtRatio, minOperatingMargin, maxPER, maxPBR } = config.fundamental;

  // 기본 펀더멘털 조건
  if (metrics.roe < minROE || metrics.debtRatio > maxDebtRatio || metrics.operatingMargin < minOperatingMargin) {
    return false;
  }

  // PER 필터 (null이면 비활성화, valuation 없으면 통과)
  if (maxPER !== null && valuation?.per !== null && valuation?.per !== undefined) {
    if (valuation.per > maxPER) return false;
  }

  // PBR 필터 (null이면 비활성화, valuation 없으면 통과)
  if (maxPBR !== null && valuation?.pbr !== null && valuation?.pbr !== undefined) {
    if (valuation.pbr > maxPBR) return false;
  }

  return true;
}

// ============================================================================
// Main Screening Function
// ============================================================================

/**
 * 종합 스크리닝을 수행합니다.
 *
 * @param corpMappings KOSPI 기업 매핑 (시가총액 포함)
 * @param financialMetrics 재무 지표
 * @param valuationMap 종목코드 → PER/PBR 데이터
 * @param config 스크리닝 설정
 */
export function screenStocks(
  corpMappings: KospiCorpMapping[],
  financialMetrics: FinancialMetrics[],
  valuationMap: Map<string, { per: number | null; pbr: number | null }>,
  config: ScreeningConfig = SCREENING_CONFIG
): ScreenedStock[] {
  // 시가총액/기업명 맵 생성
  const marketCapMap = new Map<string, number>();
  const corpNameMap = new Map<string, string>();
  for (const corp of corpMappings) {
    marketCapMap.set(corp.stockCode, corp.marketCap);
    corpNameMap.set(corp.stockCode, corp.corpName);
  }

  const results: ScreenedStock[] = [];

  for (const metrics of financialMetrics) {
    // 펀더멘털 필터링 (PER/PBR 포함)
    const valuation = valuationMap.get(metrics.stockCode);
    if (!evaluateFundamental(metrics, config, valuation)) {
      continue;
    }

    // 결과에 추가
    results.push({
      stockCode: metrics.stockCode,
      corpName: corpNameMap.get(metrics.stockCode) || metrics.corpName,
      corpCode: metrics.corpCode,
      marketCap: marketCapMap.get(metrics.stockCode) || 0,
      roe: metrics.roe,
      debtRatio: metrics.debtRatio,
      operatingMargin: metrics.operatingMargin,
    });
  }

  console.log(`[Stock Screening] ${results.length}/${financialMetrics.length} passed all filters`);

  // 시가총액 내림차순 정렬
  const sorted = [...results].sort((a, b) => b.marketCap - a.marketCap);

  // Top N 반환
  const topN = sorted.slice(0, config.topN);
  console.log(`[Stock Screening] Returning top ${config.topN}: ${topN.map((s) => s.stockCode).join(", ")}`);

  return topN;
}
