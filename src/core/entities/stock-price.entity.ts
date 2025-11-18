/**
 * 주가 데이터 도메인 모델
 */

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
