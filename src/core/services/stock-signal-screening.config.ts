/**
 * @fileoverview 시그널 스크리닝 설정
 */

// ============================================================================
// Types
// ============================================================================

export interface FundamentalConfig {
  enabled: boolean;
  minROE: number; // 최소 ROE (%)
  maxDebtRatio: number; // 최대 부채비율 (%)
  minOperatingMargin: number; // 최소 영업이익률 (%)
}

export interface TechnicalConfig {
  enabled: boolean;
  maxRSI: number; // 최대 RSI (과매도 기준)
  rsiPeriod: number; // RSI 계산 기간
  goldenCrossEnabled: boolean; // 골든크로스 필터 사용 여부
  goldenCrossShortPeriod: number; // 단기 이평선
  goldenCrossLongPeriod: number; // 장기 이평선
  volumeSpikeEnabled: boolean; // 거래량 급등 필터 사용 여부
  volumeSpikeThreshold: number; // 거래량 급등 배수
  volumeSpikePeriod: number; // 거래량 평균 계산 기간
}

export interface ScreeningConfig {
  fundamental: FundamentalConfig;
  technical: TechnicalConfig;
  topN: number; // 반환할 종목 수
}

// ============================================================================
// Config
// ============================================================================

export const SCREENING_CONFIG: ScreeningConfig = {
  fundamental: {
    enabled: true,
    minROE: 10,
    maxDebtRatio: 150,
    minOperatingMargin: 5,
  },
  technical: {
    enabled: true,
    maxRSI: 35,
    rsiPeriod: 14,
    goldenCrossEnabled: true,
    goldenCrossShortPeriod: 5,
    goldenCrossLongPeriod: 20,
    volumeSpikeEnabled: true,
    volumeSpikeThreshold: 2.0,
    volumeSpikePeriod: 20,
  },
  topN: 20,
};
