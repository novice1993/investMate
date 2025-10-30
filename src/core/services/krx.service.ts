import { getMarketSecurities } from "@/core/infrastructure/security-krx.infra";

/**
 * @fileoverview KRX(한국거래소) 데이터 수집 서비스
 * `globalThis`를 사용하여 Next.js 개발 환경의 Hot Reloading에서도 캐시가 유지되도록 구현
 */

// 1. globalThis에 캐시 객체의 타입을 선언
declare global {
  var kospiCodesCache: { symbol: string; name: string }[];
}

// 2. 캐시 초기화
globalThis.kospiCodesCache = globalThis.kospiCodesCache || [];

/**
 * KOSPI 시장 종목 코드 및 이름 목록을 가져와서 캐시에 저장합니다.
 * @returns 종목 코드와 이름 배열
 */
export async function fetchAndCacheKospiCodes(): Promise<{ symbol: string; name: string }[]> {
  console.log("[KrxService] Fetching KOSPI market securities from KRX...");

  const securities = await getMarketSecurities("KOSPI");

  if (!securities || securities.length === 0) {
    throw new Error("No securities found from KRX");
  }

  const codeList = securities.flatMap((security) => (security.symbol && security.name ? [{ symbol: security.symbol, name: security.name }] : []));

  globalThis.kospiCodesCache = codeList;

  console.log(`[KrxService] Successfully fetched and cached ${codeList.length} KOSPI codes`);
  return codeList;
}

/**
 * 캐시된 KOSPI 종목 코드 목록을 반환합니다.
 * @returns 캐시된 종목 코드와 이름 배열
 */
export function getKospiCodes(): { symbol: string; name: string }[] {
  return globalThis.kospiCodesCache;
}
