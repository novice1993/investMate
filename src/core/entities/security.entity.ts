/**
 * 금융 상품(주식, ETF 등)의 핵심 정보를 나타내는 데이터 구조입니다.
 * yfinance 응답 데이터를 기반으로 애플리케이션에서 사용할 주요 필드를 정의합니다.
 */
export interface Security {
  /**
   * 종목 코드 (Ticker Symbol)
   * @example 'AAPL', '005930.KS'
   */
  symbol: string;

  /**
   * 종목 약칭
   * @example 'Apple Inc.', 'Samsung Electronics Co., Ltd.'
   */
  shortName: string;

  /**
   * 종목 전체 이름
   */
  longName?: string;

  /**
   * 통화 단위
   * @example 'USD', 'KRW'
   */
  currency: string;

  /**
   * 정규 시장의 현재 또는 종가
   */
  regularMarketPrice: number;

  /**
   * 정규 시장의 가격 변동액
   */
  regularMarketChange: number;

  /**
   * 정규 시장의 가격 변동률 (%)
   */
  regularMarketChangePercent: number;

  /**
   * 정규 시장의 전일 종가
   */
  regularMarketPreviousClose: number;

  /**
   * 정규 시장의 시가
   */
  regularMarketOpen: number;

  /**
   * 정규 시장의 당일 고가
   */
  regularMarketDayHigh: number;

  /**
   * 정규 시장의 당일 저가
   */
  regularMarketDayLow: number;

  /**
   * 정규 시장의 당일 거래량
   */
  regularMarketVolume: number;

  /**
   * 시가총액
   */
  marketCap: number;

  /**
   * 후행 주가수익비율 (Trailing P/E)
   */
  trailingPE?: number;

  /**
   * 선행 주가수익비율 (Forward P/E)
   */
  forwardPE?: number;

  /**
   * 주당순이익 (지난 12개월)
   */
  epsTrailingTwelveMonths?: number;

  /**
   * 주가순자산비율 (PBR)
   */
  priceToBook?: number;

  /**
   * 52주 최고가
   */
  fiftyTwoWeekHigh: number;

  /**
   * 52주 최저가
   */
  fiftyTwoWeekLow: number;

  /**
   * 3개월 평균 일일 거래량
   */
  averageDailyVolume3Month: number;

  /**
   * 마지막 거래 시점의 타임스탬프
   */
  regularMarketTime: Date;
}
