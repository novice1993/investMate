/**
 * DART API에서 반환하는 기업 정보 타입
 */
export interface DartCorp {
  /** 고유번호 (8자리) - DART에서 사용하는 기업 식별자 */
  corpCode: string;

  /** 회사명 (정식 명칭) */
  corpName: string;

  /** 종목코드 (6자리) - 상장사만 존재, 비상장사는 빈 문자열 */
  stockCode: string;

  /** 최종 수정일 (YYYYMMDD 형식) */
  modifyDate: string;
}

/**
 * XML 파싱 시 사용되는 원본 데이터 구조
 */
export interface RawDartCorpXml {
  corp_code: string;
  corp_name: string;
  stock_code: string;
  modify_date: string;
}
