export interface Security {
  // 식별 정보
  symbol: string; // 종목 코드 (005930, AAPL) - 중복되지 않는 고유 식별자
  isin?: string; // ISIN (국제증권식별번호) - 확장성을 위해
  name: string; // 종목명 (삼성전자, Apple Inc.)

  // 시세 정보
  price: number; // 현재가
  change: number; // 등락액
  changePercent: number; // 등락률
  previousClose?: number; // 전일 종가
  open?: number; // 시가
  high?: number; // 고가
  low?: number; // 저가
  volume?: number; // 거래량

  // 시장 정보
  market: "KOSPI" | "KOSDAQ" | "NASDAQ" | "NYSE" | "ETF"; // 시장 구분
  currency: "KRW" | "USD"; // 통화
  country: "KR" | "US"; // 국가

  // 추가 정보
  marketCap?: number; // 시가총액
  source: "KRX" | "KIS"; // 데이터 출처
}
