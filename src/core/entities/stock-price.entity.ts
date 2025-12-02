/**
 * 주가 데이터 도메인 모델
 */

/**
 * 전일대비 부호
 */
export type ChangeSign = "rise" | "fall" | "flat";

/**
 * 실시간 체결가 엔티티 (KIS H0STCNT0)
 */
export interface RealtimePrice {
  /** 종목코드 (6자리) */
  stockCode: string;
  /** 체결 시간 (ISO 8601) */
  timestamp: string;
  /** 현재가 */
  price: number;
  /** 전일대비 */
  change: number;
  /** 등락률 (%) */
  changeRate: number;
  /** 전일대비 부호 */
  changeSign: ChangeSign;
  /** 누적 거래량 */
  volume: number;
}

/**
 * 일별 주가 데이터 엔티티
 */
export interface StockPrice {
  /** 종목 코드 (6자리) */
  stockCode: string;
  /** 영업일자 (YYYYMMDD) */
  date: string;
  /** 시가 */
  openPrice: number;
  /** 고가 */
  highPrice: number;
  /** 저가 */
  lowPrice: number;
  /** 종가 */
  closePrice: number;
  /** 거래량 */
  volume: number;
  /** 전일 대비 */
  change: number;
  /** 전일 대비율 (%) */
  changePercent: number;
}
