/**
 * KIS API 현재가 응답 타입
 */
export interface KisCurrentPriceOutput {
  stck_prpr: string; // 주식 현재가
  prdy_vrss: string; // 전일 대비
  prdy_vrss_sign: string; // 전일 대비 부호
  prdy_ctrt: string; // 전일 대비율
  acml_vol: string; // 누적 거래량
  acml_tr_pbmn: string; // 누적 거래 대금
  hts_kor_isnm: string; // HTS 한글 종목명
  stck_oprc: string; // 주식 시가
  stck_hgpr: string; // 주식 최고가
  stck_lwpr: string; // 주식 최저가
  stck_mxpr: string; // 주식 상한가
  stck_llam: string; // 주식 하한가
  stck_sdpr: string; // 주식 기준가
  per: string; // PER
  pbr: string; // PBR
  eps: string; // EPS
  bps: string; // BPS
  [key: string]: string; // 기타 필드들
}

/**
 * KIS API 기간별 시세 응답 타입
 */
export interface KisPeriodPriceOutput {
  stck_bsop_date: string; // 주식 영업 일자
  stck_oprc: string; // 주식 시가
  stck_hgpr: string; // 주식 최고가
  stck_lwpr: string; // 주식 최저가
  stck_clpr: string; // 주식 종가
  acml_vol: string; // 누적 거래량
  prdy_vrss: string; // 전일 대비
  prdy_vrss_sign: string; // 전일 대비 부호
  prdy_ctrt: string; // 전일 대비율
  [key: string]: string; // 기타 필드들
}

/**
 * 배치 조회 결과 타입
 */
export interface StockPriceBatchResult {
  stockCode: string;
  data: KisCurrentPriceOutput | null;
  error?: string;
}
