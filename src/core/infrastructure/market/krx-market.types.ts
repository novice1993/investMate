/**
 * KRX에서 받은 CSV 데이터 한 행의 타입을 정의합니다.
 */
export interface RawKrxRow {
  종목코드: string;
  종목명: string;
  시장구분: string;
  종가: string;
  대비: string;
  등락률: string;
  시가총액: string;
  거래량: string;
  [key: string]: string; // 그 외 예상치 못한 컬럼이 있을 수 있음을 명시
}
