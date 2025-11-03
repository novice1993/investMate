/**
 * DART API 재무제표 조회 관련 타입 정의
 */

/**
 * 재무제표 구분
 */
export type FinancialStatementDiv = "CFS" | "OFS";

/**
 * 보고서 코드
 */
export type ReportCode = "11011" | "11012" | "11013" | "11014";

/**
 * 재무제표 조회 요청 파라미터
 */
export interface FetchFinancialStatementParams {
  /** 기업 고유번호 (8자리) */
  corp_code: string;
  /** 사업연도 (4자리) */
  bsns_year: string;
  /** 보고서 코드 (11011: 사업보고서, 11012: 반기, 11013: 1분기, 11014: 3분기) */
  reprt_code: ReportCode;
  /** 재무제표 구분 (CFS: 연결, OFS: 개별) */
  fs_div: FinancialStatementDiv;
}

/**
 * DART API 원본 응답 - 재무제표 계정 항목
 */
export interface RawDartFinancialAccount {
  /** 접수번호 */
  rcept_no: string;
  /** 보고서 코드 */
  reprt_code: string;
  /** 사업연도 */
  bsns_year: string;
  /** 기업 고유번호 */
  corp_code: string;
  /** 재무제표 구분 (BS: 재무상태표, IS: 손익계산서, CIS: 포괄손익계산서, CF: 현금흐름표) */
  sj_div: string;
  /** 재무제표명 */
  sj_nm: string;
  /** 계정 ID */
  account_id: string;
  /** 계정명 */
  account_nm: string;
  /** 계정 상세 */
  account_detail: string;
  /** 당기명 */
  thstrm_nm: string;
  /** 당기 금액 */
  thstrm_amount: string;
  /** 당기 누적 금액 */
  thstrm_add_amount: string | null;
  /** 전기명 */
  frmtrm_nm: string;
  /** 전기 금액 */
  frmtrm_amount: string;
  /** 전기 누적 금액 */
  frmtrm_add_amount: string | null;
  /** 전전기명 */
  bfefrmtrm_nm: string;
  /** 전전기 금액 */
  bfefrmtrm_amount: string | null;
  /** 정렬 순서 */
  ord: string;
}

/**
 * DART API 응답 구조
 */
export interface DartFinancialResponse {
  /** 상태 코드 (000: 정상, 010: 등록되지 않은 키, 013: 조회된 데이터 없음, 020: 요청 제한 초과) */
  status: string;
  /** 상태 메시지 */
  message: string;
  /** 재무제표 계정 목록 */
  list?: RawDartFinancialAccount[];
}
