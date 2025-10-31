/**
 * @fileoverview 상장 법인 관련 도메인 엔티티
 *
 * 비즈니스 도메인:
 * - 상장사(Listed Company): 증권거래소에 상장된 기업
 * - 시장(Market): KOSPI, KOSDAQ 등
 */

/**
 * 시장 종류
 */
export type Market = "KOSPI" | "KOSDAQ";

/**
 * 주식 종목 정보
 * 증권거래소(KRX)에서 관리하는 상장 종목
 */
export interface Stock {
  /** 종목 코드 (6자리) */
  symbol: string;
  /** 종목명 */
  name: string;
  /** 시장 구분 */
  market: Market;
}

/**
 * 기업 정보
 * 금융감독원(DART)에서 관리하는 법인 정보
 */
export interface Company {
  /** 고유번호 (DART corpCode) */
  id: string;
  /** 법인명 */
  name: string;
  /** 종목 코드 (상장사인 경우) */
  stockCode?: string;
  /** 최종 수정일 */
  modifiedAt?: string;
}

/**
 * 상장 법인 (Listed Company)
 * 증권거래소에 상장된 기업의 통합 정보
 *
 * 비즈니스 의미:
 * - Stock: 거래소 관점 (종목)
 * - Company: 법인 관점 (기업 실체)
 * - ListedCompany: 두 정보의 통합 (상장 법인)
 */
export interface ListedCompany {
  /** 주식 종목 정보 */
  stock: Stock;
  /** 기업 정보 */
  company: Company;
}
