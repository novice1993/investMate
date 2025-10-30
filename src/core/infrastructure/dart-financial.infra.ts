import { FetchFinancialStatementParams, DartFinancialResponse, RawDartFinancialAccount } from "@/core/types/financial.type";
import { jsonHttpClient } from "@/shared/lib/http";

const DART_APP_KEY = process.env.DART_APP_KEY;
const FINANCIAL_STATEMENT_URL = "https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json";

/**
 * DART API에서 단일 기업의 재무제표 원본 데이터를 조회합니다.
 * Infrastructure 계층은 파싱 없이 원본 데이터만 반환합니다.
 *
 * @param params 재무제표 조회 파라미터
 * @returns DART API 원본 응답 (계정 항목 배열)
 */
export async function fetchFinancialStatementRaw(params: FetchFinancialStatementParams): Promise<RawDartFinancialAccount[]> {
  if (!DART_APP_KEY) {
    throw new Error("DART_APP_KEY environment variable is not set");
  }

  // URL 생성
  const url = new URL(FINANCIAL_STATEMENT_URL);
  url.searchParams.append("crtfc_key", DART_APP_KEY);
  url.searchParams.append("corp_code", params.corp_code);
  url.searchParams.append("bsns_year", params.bsns_year);
  url.searchParams.append("reprt_code", params.reprt_code);
  url.searchParams.append("fs_div", params.fs_div);

  try {
    // HTTP 모듈 사용 - 에러 처리 중앙화
    const data = await jsonHttpClient.get<DartFinancialResponse>(url.toString());

    // DART API 에러 처리
    if (data.status !== "000") {
      throw new Error(`[DART Financial] API error: ${data.status} - ${data.message}`);
    }

    if (!data.list || data.list.length === 0) {
      console.warn(`[DART Financial] No financial data found for corp_code: ${params.corp_code}`);
      return [];
    }

    console.log(`[DART Financial] Fetched ${data.list.length} accounts for ${params.corp_code}`);
    return data.list;
  } catch (error) {
    console.error(`[DART Financial] Failed to fetch financial statement:`, error);
    throw error;
  }
}
