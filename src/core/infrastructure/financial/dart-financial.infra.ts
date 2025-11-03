import { FinancialStatement } from "@/core/entities/financial.entity";
import { jsonHttpClient } from "@/shared/lib/http";
import { FetchFinancialStatementParams, DartFinancialResponse, RawDartFinancialAccount } from "./financial.type";

const DART_APP_KEY = process.env.DART_APP_KEY;
const FINANCIAL_STATEMENT_URL = "https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json";

/**
 * DART API에서 재무제표를 조회하고 Entity로 변환합니다.
 */
export async function fetchFinancialStatement(params: FetchFinancialStatementParams, stockCode?: string): Promise<FinancialStatement> {
  const rawAccounts = await fetchFinancialStatementRaw(params);
  return parseFinancialStatementEntity(rawAccounts, params.corp_code, stockCode);
}

/**
 * DART API에서 단일 기업의 재무제표 원본 데이터를 조회합니다.
 */
async function fetchFinancialStatementRaw(params: FetchFinancialStatementParams): Promise<RawDartFinancialAccount[]> {
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
  const netIncome = findAccountAmountWithFallback(accounts, ["분기순이익", "분기순이익(손실)", "반기순이익", "당기순이익"]);

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
