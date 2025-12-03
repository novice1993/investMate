import { RSI, SMA, EMA, MACD } from "technicalindicators";

/**
 * 기술적 지표 계산 서비스
 * - RSI (Relative Strength Index)
 * - SMA (Simple Moving Average)
 * - EMA (Exponential Moving Average)
 * - MACD (Moving Average Convergence Divergence)
 * - 거래량 급등 감지
 */

// ============================================================================
// Public Types
// ============================================================================

/**
 * RSI 계산 결과
 */
export interface RSIResult {
  values: number[];
  latest: number | null;
  period: number;
}

/**
 * 이동평균 계산 결과
 */
export interface MovingAverageResult {
  values: number[];
  latest: number | null;
  period: number;
}

/**
 * MACD 계산 결과
 */
export interface MACDResult {
  macd: number[];
  signal: number[];
  histogram: number[];
  latest: {
    macd: number | null;
    signal: number | null;
    histogram: number | null;
  };
}

/**
 * 골든/데드크로스 결과
 */
export interface CrossoverResult {
  type: "golden" | "dead" | "none";
  shortMA: number | null;
  longMA: number | null;
}

/**
 * 거래량 급등 결과
 */
export interface VolumeSpike {
  isSpike: boolean;
  currentVolume: number;
  averageVolume: number;
  ratio: number; // 평균 대비 비율
}

/**
 * 종합 기술적 지표
 */
export interface TechnicalIndicators {
  stockCode: string;
  rsi: RSIResult;
  sma5: MovingAverageResult;
  sma20: MovingAverageResult;
  sma60: MovingAverageResult;
  macd: MACDResult;
  crossover: CrossoverResult;
  volumeSpike: VolumeSpike;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * RSI (Relative Strength Index) 계산
 *
 * @param closePrices 종가 배열 (오래된 순)
 * @param period 기간 (기본값: 14)
 * @returns RSI 결과
 */
export function calculateRSI(closePrices: number[], period: number = 14): RSIResult {
  if (closePrices.length < period + 1) {
    return { values: [], latest: null, period };
  }

  const values = RSI.calculate({
    values: closePrices,
    period,
  });

  return {
    values,
    latest: values.length > 0 ? values[values.length - 1] : null,
    period,
  };
}

/**
 * SMA (Simple Moving Average) 계산
 *
 * @param closePrices 종가 배열 (오래된 순)
 * @param period 기간
 * @returns 이동평균 결과
 */
export function calculateSMA(closePrices: number[], period: number): MovingAverageResult {
  if (closePrices.length < period) {
    return { values: [], latest: null, period };
  }

  const values = SMA.calculate({
    values: closePrices,
    period,
  });

  return {
    values,
    latest: values.length > 0 ? values[values.length - 1] : null,
    period,
  };
}

/**
 * EMA (Exponential Moving Average) 계산
 *
 * @param closePrices 종가 배열 (오래된 순)
 * @param period 기간
 * @returns 이동평균 결과
 */
export function calculateEMA(closePrices: number[], period: number): MovingAverageResult {
  if (closePrices.length < period) {
    return { values: [], latest: null, period };
  }

  const values = EMA.calculate({
    values: closePrices,
    period,
  });

  return {
    values,
    latest: values.length > 0 ? values[values.length - 1] : null,
    period,
  };
}

/**
 * MACD 계산
 *
 * @param closePrices 종가 배열 (오래된 순)
 * @param fastPeriod 단기 EMA 기간 (기본값: 12)
 * @param slowPeriod 장기 EMA 기간 (기본값: 26)
 * @param signalPeriod 시그널선 기간 (기본값: 9)
 * @returns MACD 결과
 */
export function calculateMACD(closePrices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): MACDResult {
  const minLength = slowPeriod + signalPeriod;

  if (closePrices.length < minLength) {
    return {
      macd: [],
      signal: [],
      histogram: [],
      latest: { macd: null, signal: null, histogram: null },
    };
  }

  const result = MACD.calculate({
    values: closePrices,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  const macdValues = result.map((r) => r.MACD ?? 0);
  const signalValues = result.map((r) => r.signal ?? 0);
  const histogramValues = result.map((r) => r.histogram ?? 0);

  const lastResult = result[result.length - 1];

  return {
    macd: macdValues,
    signal: signalValues,
    histogram: histogramValues,
    latest: {
      macd: lastResult?.MACD ?? null,
      signal: lastResult?.signal ?? null,
      histogram: lastResult?.histogram ?? null,
    },
  };
}

/**
 * 골든크로스 / 데드크로스 감지
 *
 * @param closePrices 종가 배열 (오래된 순)
 * @param shortPeriod 단기 이평선 기간 (기본값: 5)
 * @param longPeriod 장기 이평선 기간 (기본값: 20)
 * @returns 크로스오버 결과
 */
export function detectCrossover(closePrices: number[], shortPeriod: number = 5, longPeriod: number = 20): CrossoverResult {
  if (closePrices.length < longPeriod + 1) {
    return { type: "none", shortMA: null, longMA: null };
  }

  const shortMA = SMA.calculate({ values: closePrices, period: shortPeriod });
  const longMA = SMA.calculate({ values: closePrices, period: longPeriod });

  // 최소 2개의 값이 필요 (이전 값과 현재 값 비교)
  if (shortMA.length < 2 || longMA.length < 2) {
    return { type: "none", shortMA: null, longMA: null };
  }

  // 배열 길이 맞추기 (longMA 기준)
  const offset = shortMA.length - longMA.length;
  const alignedShortMA = shortMA.slice(offset);

  const currentShort = alignedShortMA[alignedShortMA.length - 1];
  const previousShort = alignedShortMA[alignedShortMA.length - 2];
  const currentLong = longMA[longMA.length - 1];
  const previousLong = longMA[longMA.length - 2];

  // 골든크로스: 단기선이 장기선을 상향 돌파
  if (previousShort <= previousLong && currentShort > currentLong) {
    return { type: "golden", shortMA: currentShort, longMA: currentLong };
  }

  // 데드크로스: 단기선이 장기선을 하향 돌파
  if (previousShort >= previousLong && currentShort < currentLong) {
    return { type: "dead", shortMA: currentShort, longMA: currentLong };
  }

  return { type: "none", shortMA: currentShort, longMA: currentLong };
}

/**
 * 거래량 급등 감지
 *
 * @param volumes 거래량 배열 (오래된 순)
 * @param period 평균 계산 기간 (기본값: 20)
 * @param threshold 급등 기준 비율 (기본값: 2.0 = 200%)
 * @returns 거래량 급등 결과
 */
export function detectVolumeSpike(volumes: number[], period: number = 20, threshold: number = 2.0): VolumeSpike {
  if (volumes.length < period + 1) {
    return {
      isSpike: false,
      currentVolume: volumes[volumes.length - 1] || 0,
      averageVolume: 0,
      ratio: 0,
    };
  }

  // 현재 거래량 (마지막)
  const currentVolume = volumes[volumes.length - 1];

  // 이전 N일 평균 (현재 제외)
  const previousVolumes = volumes.slice(-period - 1, -1);
  const averageVolume = previousVolumes.reduce((sum, v) => sum + v, 0) / period;

  const ratio = averageVolume > 0 ? currentVolume / averageVolume : 0;

  return {
    isSpike: ratio >= threshold,
    currentVolume,
    averageVolume,
    ratio,
  };
}

/**
 * 종목의 모든 기술적 지표 계산
 *
 * @param stockCode 종목 코드
 * @param closePrices 종가 배열 (오래된 순)
 * @param volumes 거래량 배열 (오래된 순)
 * @returns 종합 기술적 지표
 */
export function calculateAllIndicators(stockCode: string, closePrices: number[], volumes: number[]): TechnicalIndicators {
  return {
    stockCode,
    rsi: calculateRSI(closePrices, 14),
    sma5: calculateSMA(closePrices, 5),
    sma20: calculateSMA(closePrices, 20),
    sma60: calculateSMA(closePrices, 60),
    macd: calculateMACD(closePrices),
    crossover: detectCrossover(closePrices, 5, 20),
    volumeSpike: detectVolumeSpike(volumes, 20, 2.0),
  };
}
