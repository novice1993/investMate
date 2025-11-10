import { FinancialStatement } from "@/core/entities/financial.entity";
import { jsonHttpClient } from "@/shared/lib/http";
import { DartFinancialResponse, RawDartFinancialAccount, FetchFinancialStatementParams } from "./financial.type";

const DART_APP_KEY = process.env.DART_APP_KEY;
const MULTI_FINANCIAL_STATEMENT_URL = "https://opendart.fss.or.kr/api/fnlttMultiAcnt.json";

// ============================================================================
// Public API
// ============================================================================

/**
 * 다중 기업의 재무제표 원본 데이터를 조회합니다.
 *
 * 책임: 위 헬퍼 함수들을 조합하여 Infrastructure 공개 API 제공
 *
 * @param corpCodes 기업 고유번호 배열 (최대 100개 권장)
 * @param params 재무제표 조회 파라미터 (corp_code 제외)
 * @returns 기업별 계정 데이터와 누락된 기업 목록
 */
export async function fetchMultipleFinancialStatementsRaw(
  corpCodes: string[],
  params: Omit<FetchFinancialStatementParams, "corp_code">
): Promise<{
  data: Map<string, RawDartFinancialAccount[]>;
  missing: string[];
}> {
  if (corpCodes.length === 0) {
    return { data: new Map(), missing: [] };
  }

  try {
    // 1. DART API 호출
    const response = await fetchFromDartMultiApi(corpCodes, params);

    // 2. API 에러 처리
    if (response.status !== "000") {
      console.warn(`[DART Multi] API warning: ${response.status} - ${response.message}`);
      return { data: new Map(), missing: corpCodes };
    }

    if (!response.list || response.list.length === 0) {
      console.warn(`[DART Multi] No data found for ${corpCodes.length} companies`);
      return { data: new Map(), missing: corpCodes };
    }

    // 3. 기업별로 그룹화
    const groupedData = groupAccountsByCorpCode(response.list);

    // 4. 누락 기업 계산
    const receivedCorpCodes = new Set(groupedData.keys());
    const missing = calculateMissingCorpCodes(corpCodes, receivedCorpCodes);

    console.log(`[DART Multi] Fetched ${groupedData.size}/${corpCodes.length} companies (${missing.length} missing)`);

    return { data: groupedData, missing };
  } catch (error) {
    console.error(`[DART Multi] Failed to fetch:`, error);
    return { data: new Map(), missing: corpCodes };
  }
}

/**
 * 다중 기업의 재무제표를 조회하고 Entity로 변환합니다.
 *
 * @param corpCodes 기업 고유번호 배열 (최대 100개 권장)
 * @param params 재무제표 조회 파라미터 (corp_code 제외)
 * @returns 기업별 재무제표 Entity와 누락된 기업 목록
 */
export async function fetchMultipleFinancialStatements(
  corpCodes: string[],
  params: Omit<FetchFinancialStatementParams, "corp_code">
): Promise<{
  data: Map<string, FinancialStatement>;
  missing: string[];
}> {
  const rawResult = await fetchMultipleFinancialStatementsRaw(corpCodes, params);

  const entities = new Map<string, FinancialStatement>();

  for (const [corpCode, accounts] of rawResult.data) {
    try {
      const entity = parseFinancialStatementEntity(accounts, corpCode);
      entities.set(corpCode, entity);
    } catch (error) {
      console.warn(`[DART Multi] Failed to parse entity for ${corpCode}:`, error);
      rawResult.missing.push(corpCode);
    }
  }

  return { data: entities, missing: rawResult.missing };
}

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * DART API 원본 계정 배열에서 재무제표 엔티티를 파싱합니다.
 */
function parseFinancialStatementEntity(accounts: RawDartFinancialAccount[], corpCode: string, stockCode?: string): FinancialStatement {
  if (accounts.length === 0) {
    throw new Error(`No financial accounts provided for corp_code: ${corpCode}`);
  }

  const firstAccount = accounts[0];
  const year = firstAccount.bsns_year;
  const quarter = getQuarterFromReportCode(firstAccount.reprt_code);

  // 재무상태표 (시점 데이터)
  const totalAssets = findAccountAmount(accounts, "자산총계");
  const totalLiabilities = findAccountAmount(accounts, "부채총계");
  const totalEquity = findAccountAmount(accounts, "자본총계");

  // 손익계산서 (누적 데이터)
  const revenue = findAccountAmount(accounts, "매출액");
  const operatingProfit = findAccountAmount(accounts, "영업이익");
  const netIncome = findAccountAmountWithFallback(accounts, ["당기순이익(손실)", "분기순이익", "분기순이익(손실)", "반기순이익", "당기순이익"]);

  return {
    corpCode,
    stockCode,
    year,
    quarter,
    totalAssets,
    totalLiabilities,
    totalEquity,
    revenue,
    operatingProfit,
    netIncome,
  };
}

function findAccountAmount(accounts: RawDartFinancialAccount[], accountName: string): number {
  const account = accounts.find((acc) => acc.account_nm === accountName);
  return account ? parseAmount(account.thstrm_amount) : 0;
}

function findAccountAmountWithFallback(accounts: RawDartFinancialAccount[], accountNames: string[]): number {
  for (const accountName of accountNames) {
    const account = accounts.find((acc) => acc.account_nm === accountName);
    if (account) return parseAmount(account.thstrm_amount);
  }
  return 0;
}

function parseAmount(amount: string): number {
  if (!amount) return 0;
  return parseFloat(amount.replace(/,/g, "")) || 0;
}

function getQuarterFromReportCode(reportCode: string): number {
  const quarterMap: Record<string, number> = {
    "11013": 1,
    "11012": 2,
    "11014": 3,
    "11011": 4,
  };
  if (!quarterMap[reportCode]) {
    throw new Error(`Unknown report code: ${reportCode}`);
  }
  return quarterMap[reportCode];
}

/**
 * DART Multi API에서 다중 기업의 재무제표 데이터를 조회합니다.
 *
 * 책임: DART API 호출 및 응답 반환만 담당
 */
async function fetchFromDartMultiApi(corpCodes: string[], params: Omit<FetchFinancialStatementParams, "corp_code">): Promise<DartFinancialResponse> {
  if (!DART_APP_KEY) {
    throw new Error("DART_APP_KEY environment variable is not set");
  }

  const url = new URL(MULTI_FINANCIAL_STATEMENT_URL);
  url.searchParams.append("crtfc_key", DART_APP_KEY);
  url.searchParams.append("corp_code", corpCodes.join(","));
  url.searchParams.append("bsns_year", params.bsns_year);
  url.searchParams.append("reprt_code", params.reprt_code);
  url.searchParams.append("fs_div", params.fs_div);

  return await jsonHttpClient.get<DartFinancialResponse>(url.toString());
}

/**
 * 재무제표 계정 배열을 기업별로 그룹화합니다.
 *
 * 책임: 데이터 그룹화만 담당
 */
function groupAccountsByCorpCode(accounts: RawDartFinancialAccount[]): Map<string, RawDartFinancialAccount[]> {
  const grouped = new Map<string, RawDartFinancialAccount[]>();

  for (const account of accounts) {
    if (!grouped.has(account.corp_code)) {
      grouped.set(account.corp_code, []);
    }
    grouped.get(account.corp_code)!.push(account);
  }

  return grouped;
}

/**
 * 요청한 기업 중 응답에 포함되지 않은 기업 목록을 계산합니다.
 *
 * 책임: 누락 기업 계산만 담당
 */
function calculateMissingCorpCodes(requested: string[], received: Set<string>): string[] {
  return requested.filter((code) => !received.has(code));
}
