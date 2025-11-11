import type { Stock, Company, ListedCompany, Market } from "@/core/entities/listed-company.entity";
import { getFilteredDartCorpCodes } from "@/core/infrastructure/financial/dart.infra";
import { getMarketStockCodes } from "@/core/infrastructure/market/krx.infra";

/**
 * @fileoverview 상장 법인 비즈니스 로직
 *
 * 책임:
 * - 주식 종목과 기업 정보를 매칭하여 상장 법인 정보 제공
 * - 순수 비즈니스 로직과 Infrastructure 호출 분리
 */

// ============================================================================
// Public API
// ============================================================================

/**
 * 특정 시장의 상장 법인 목록을 조회합니다.
 *
 * @param market - 시장 구분 (KOSPI, KOSDAQ)
 * @returns 상장 법인 목록
 *
 * 프로세스:
 * 1. KRX Infrastructure에서 시장별 종목 코드 조회
 * 2. DART Infrastructure에서 필터링된 기업 정보 조회 (메모리 최적화)
 * 3. Infrastructure 데이터를 도메인 Entity로 변환
 * 4. 순수 비즈니스 로직으로 매칭 수행
 */
export async function getListedCompaniesByMarket(market: Market): Promise<ListedCompany[]> {
  console.log(`[ListedCompanyService] Fetching ${market} listed companies...`);

  // 1. KRX에서 시장별 종목 코드 조회
  const krxStockCodes = await getMarketStockCodes(market);

  if (krxStockCodes.length === 0) {
    console.warn(`[ListedCompanyService] No stock codes found for ${market}`);
    return [];
  }

  // 2. 종목코드 Set 생성 (DART 필터링용)
  const stockCodeSet = new Set(krxStockCodes.map((code) => code.symbol));

  // 3. DART에서 매칭되는 기업만 조회 (메모리 최적화: 114k → 958개만)
  const dartCorps = await getFilteredDartCorpCodes(stockCodeSet);

  if (dartCorps.length === 0) {
    console.warn("[ListedCompanyService] No DART corporations found");
    return [];
  }

  // 4. Infrastructure 데이터를 도메인 Entity로 변환
  const stocks: Stock[] = krxStockCodes.map((code) => ({
    symbol: code.symbol,
    name: code.name,
    market,
  }));

  const companies: Company[] = dartCorps.map((corp) => ({
    id: corp.corpCode,
    name: corp.corpName,
    stockCode: corp.stockCode,
    modifiedAt: corp.modifyDate,
  }));

  // 5. 순수 비즈니스 로직 실행 (Helper 함수)
  const listedCompanies = matchStocksWithCompanies(stocks, companies);

  console.log(`[ListedCompanyService] Matched ${listedCompanies.length} ${market} companies ` + `(from ${stocks.length} stocks and ${dartCorps.length} filtered companies)`);

  return listedCompanies;
}

/**
 * KOSPI 상장 법인 목록을 조회합니다.
 */
export async function getKospiListedCompanies(): Promise<ListedCompany[]> {
  return getListedCompaniesByMarket("KOSPI");
}

/**
 * KOSDAQ 상장 법인 목록을 조회합니다.
 */
export async function getKosdaqListedCompanies(): Promise<ListedCompany[]> {
  return getListedCompaniesByMarket("KOSDAQ");
}

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * 주식 종목과 기업을 종목 코드 기반으로 매칭 (순수 함수)
 *
 * @param stocks - 주식 종목 목록
 * @param companies - 기업 정보 목록
 * @returns 매칭된 상장 법인 목록
 *
 * 비즈니스 로직:
 * 1. 주식 종목 코드 Set 생성 (O(1) 조회 최적화)
 * 2. 기업의 종목 코드를 6자리로 정규화
 * 3. 매칭되는 기업만 필터링하여 ListedCompany 생성
 */
function matchStocksWithCompanies(stocks: Stock[], companies: Company[]): ListedCompany[] {
  // 1. 빠른 조회를 위한 종목 코드 Set 생성
  const stockSymbolSet = new Set(stocks.map((stock) => stock.symbol));

  // 2. 종목 코드로 빠른 Stock 조회를 위한 Map 생성
  const stockBySymbol = new Map(stocks.map((stock) => [stock.symbol, stock]));

  const result: ListedCompany[] = [];

  // 3. 기업 목록을 순회하며 매칭
  for (const company of companies) {
    if (!company.stockCode) continue;

    // DART 종목 코드를 6자리로 정규화 (앞에 0 패딩)
    // Infrastructure에서 이미 string 타입 보장됨
    const normalizedStockCode = company.stockCode.padStart(6, "0");

    // 매칭되는 주식 종목이 있는지 확인
    if (stockSymbolSet.has(normalizedStockCode)) {
      const stock = stockBySymbol.get(normalizedStockCode);

      if (stock) {
        result.push({
          stock,
          company,
        });
      }
    }
  }

  return result;
}
