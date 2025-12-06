/**
 * @fileoverview Signal 트리거 서비스
 *
 * 기술적 지표를 기반으로 매수 타이밍 시그널을 감지합니다.
 */

import type { StockPrice } from "@/core/entities/stock-price.entity";
import { calculateRSI, detectCrossover, detectVolumeSpike, type RSIResult, type CrossoverResult, type VolumeSpike } from "@/core/services/technical-indicator.service";

// ============================================================================
// Types
// ============================================================================

export interface SignalTriggerConfig {
  rsi: {
    enabled: boolean;
    period: number;
    oversoldThreshold: number; // 과매도 기준 (이하면 시그널)
  };
  goldenCross: {
    enabled: boolean;
    shortPeriod: number;
    longPeriod: number;
  };
  volumeSpike: {
    enabled: boolean;
    period: number;
    threshold: number; // 평균 대비 배수
  };
}

export interface SignalTriggerResult {
  stockCode: string;
  rsi: RSIResult | null;
  crossover: CrossoverResult | null;
  volumeSpike: VolumeSpike | null;
  triggers: {
    rsiOversold: boolean;
    goldenCross: boolean;
    volumeSpike: boolean;
  };
  hasAnyTrigger: boolean;
}

// ============================================================================
// Config
// ============================================================================

export const SIGNAL_TRIGGER_CONFIG: SignalTriggerConfig = {
  rsi: {
    enabled: true,
    period: 14,
    oversoldThreshold: 30,
  },
  goldenCross: {
    enabled: true,
    shortPeriod: 5,
    longPeriod: 20,
  },
  volumeSpike: {
    enabled: true,
    period: 20,
    threshold: 2.0,
  },
};

// ============================================================================
// Signal Detection
// ============================================================================

/**
 * 기술적 지표를 계산하고 시그널 트리거를 감지합니다.
 */
export function detectSignalTriggers(stockCode: string, priceData: StockPrice[], config: SignalTriggerConfig = SIGNAL_TRIGGER_CONFIG): SignalTriggerResult {
  const closePrices = priceData.map((p) => p.closePrice);
  const volumes = priceData.map((p) => p.volume);

  // RSI 계산
  const rsi = config.rsi.enabled ? calculateRSI(closePrices, config.rsi.period) : null;

  // 골든크로스 감지
  const crossover = config.goldenCross.enabled ? detectCrossover(closePrices, config.goldenCross.shortPeriod, config.goldenCross.longPeriod) : null;

  // 거래량 급등 감지
  const volumeSpike = config.volumeSpike.enabled ? detectVolumeSpike(volumes, config.volumeSpike.period, config.volumeSpike.threshold) : null;

  // 트리거 판정
  const triggers = {
    rsiOversold: rsi !== null && rsi.latest !== null && rsi.latest <= config.rsi.oversoldThreshold,
    goldenCross: crossover !== null && crossover.type === "golden",
    volumeSpike: volumeSpike !== null && volumeSpike.isSpike,
  };

  return {
    stockCode,
    rsi,
    crossover,
    volumeSpike,
    triggers,
    hasAnyTrigger: triggers.rsiOversold || triggers.goldenCross || triggers.volumeSpike,
  };
}

/**
 * 여러 종목의 시그널 트리거를 감지합니다.
 */
export function detectSignalTriggersForStocks(priceDataMap: Map<string, StockPrice[]>, config: SignalTriggerConfig = SIGNAL_TRIGGER_CONFIG): SignalTriggerResult[] {
  const results: SignalTriggerResult[] = [];

  for (const [stockCode, priceData] of priceDataMap) {
    if (priceData.length < 20) {
      continue; // 데이터 부족
    }

    const result = detectSignalTriggers(stockCode, priceData, config);
    if (result.hasAnyTrigger) {
      results.push(result);
    }
  }

  return results;
}
