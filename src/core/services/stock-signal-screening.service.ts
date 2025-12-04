/**
 * @fileoverview 주식 시그널 스크리닝 서비스
 *
 * 펀더멘털 + 기술적 지표를 필터링하여 Top N 종목을 선별합니다.
 */

import type { StockPrice } from "@/core/entities/stock-price.entity";
import type { KospiCorpMapping } from "@/core/infrastructure/financial/dart-stream.infra";
import type { ScreeningConfig } from "@/core/services/stock-signal-screening.config";
import { calculateRSI, detectCrossover, detectVolumeSpike, type RSIResult, type CrossoverResult, type VolumeSpike } from "@/core/services/technical-indicator.service";

// ============================================================================
// Types
// ============================================================================

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

  // 기술적 지표
  rsi: RSIResult | null;
  crossover: CrossoverResult | null;
  volumeSpike: VolumeSpike | null;
}

// ============================================================================
// Filtering Logic
// ============================================================================

/**
 * 펀더멘털 조건을 평가합니다.
 */
function evaluateFundamental(metrics: FinancialMetrics, config: ScreeningConfig): boolean {
  const { minROE, maxDebtRatio, minOperatingMargin } = config.fundamental;

  return metrics.roe >= minROE && metrics.debtRatio <= maxDebtRatio && metrics.operatingMargin >= minOperatingMargin;
}

/**
 * 기술적 지표를 계산하고 조건을 평가합니다.
 */
function evaluateTechnical(
  closePrices: number[],
  volumes: number[],
  config: ScreeningConfig
): {
  rsi: RSIResult;
  crossover: CrossoverResult;
  volumeSpike: VolumeSpike;
  passes: boolean;
} {
  const { maxRSI, rsiPeriod, goldenCrossEnabled, goldenCrossShortPeriod, goldenCrossLongPeriod, volumeSpikeEnabled, volumeSpikeThreshold, volumeSpikePeriod } = config.technical;

  const rsi = calculateRSI(closePrices, rsiPeriod);
  const crossover = detectCrossover(closePrices, goldenCrossShortPeriod, goldenCrossLongPeriod);
  const volumeSpike = detectVolumeSpike(volumes, volumeSpikePeriod, volumeSpikeThreshold);

  let passes = true;

  // RSI 필터
  if (rsi.latest !== null && rsi.latest > maxRSI) {
    passes = false;
  }

  // 골든크로스 필터
  if (goldenCrossEnabled && crossover.type !== "golden") {
    passes = false;
  }

  // 거래량 급등 필터
  if (volumeSpikeEnabled && !volumeSpike.isSpike) {
    passes = false;
  }

  return { rsi, crossover, volumeSpike, passes };
}

// ============================================================================
// Main Screening Function
// ============================================================================

/**
 * 종합 스크리닝을 수행합니다.
 *
 * @param corpMappings KOSPI 기업 매핑 (시가총액 포함)
 * @param financialMetrics 재무 지표
 * @param priceDataMap 종목코드 → 일봉 데이터
 * @param config 스크리닝 설정
 */
export function screenStocks(corpMappings: KospiCorpMapping[], financialMetrics: FinancialMetrics[], priceDataMap: Map<string, StockPrice[]>, config: ScreeningConfig): ScreenedStock[] {
  // 시가총액/기업명 맵 생성
  const marketCapMap = new Map<string, number>();
  const corpNameMap = new Map<string, string>();
  for (const corp of corpMappings) {
    marketCapMap.set(corp.stockCode, corp.marketCap);
    corpNameMap.set(corp.stockCode, corp.corpName);
  }

  const results: ScreenedStock[] = [];

  for (const metrics of financialMetrics) {
    // 1. 펀더멘털 필터링
    if (config.fundamental.enabled && !evaluateFundamental(metrics, config)) {
      continue;
    }

    // 2. 기술적 지표 계산 및 필터링
    let rsi: RSIResult | null = null;
    let crossover: CrossoverResult | null = null;
    let volumeSpike: VolumeSpike | null = null;

    if (config.technical.enabled) {
      const priceData = priceDataMap.get(metrics.stockCode);

      if (!priceData || priceData.length < 20) {
        continue; // 일봉 데이터 부족
      }

      const closePrices = priceData.map((p) => p.closePrice);
      const volumes = priceData.map((p) => p.volume);

      const technicalResult = evaluateTechnical(closePrices, volumes, config);
      if (!technicalResult.passes) {
        continue;
      }

      rsi = technicalResult.rsi;
      crossover = technicalResult.crossover;
      volumeSpike = technicalResult.volumeSpike;
    }

    // 3. 결과에 추가
    results.push({
      stockCode: metrics.stockCode,
      corpName: corpNameMap.get(metrics.stockCode) || metrics.corpName,
      corpCode: metrics.corpCode,
      marketCap: marketCapMap.get(metrics.stockCode) || 0,
      roe: metrics.roe,
      debtRatio: metrics.debtRatio,
      operatingMargin: metrics.operatingMargin,
      rsi,
      crossover,
      volumeSpike,
    });
  }

  console.log(`[Signal Screening] ${results.length}/${financialMetrics.length} passed all filters`);

  // 4. 시가총액 내림차순 정렬
  const sorted = [...results].sort((a, b) => b.marketCap - a.marketCap);

  // 5. Top N 반환
  const topN = sorted.slice(0, config.topN);
  console.log(`[Signal Screening] Returning top ${config.topN}: ${topN.map((s) => s.stockCode).join(", ")}`);

  return topN;
}

/**
 * 펀더멘털만으로 빠르게 1차 필터링합니다.
 * 일봉 데이터 조회 전 후보군을 줄이는 데 사용합니다.
 */
export function preScreenByFundamentals(corpMappings: KospiCorpMapping[], financialMetrics: FinancialMetrics[], config: ScreeningConfig): string[] {
  // 시가총액 맵 생성
  const marketCapMap = new Map<string, number>();
  for (const corp of corpMappings) {
    marketCapMap.set(corp.stockCode, corp.marketCap);
  }

  // 펀더멘털 필터링
  const passed = financialMetrics.filter((m) => evaluateFundamental(m, config));

  // 시가총액 정렬
  const sorted = [...passed].sort((a, b) => {
    const capA = marketCapMap.get(a.stockCode) || 0;
    const capB = marketCapMap.get(b.stockCode) || 0;
    return capB - capA;
  });

  // Top N * 2 반환 (기술적 필터 후 줄어들 것 대비)
  const limit = Math.min(config.topN * 2, sorted.length);
  return sorted.slice(0, limit).map((m) => m.stockCode);
}
