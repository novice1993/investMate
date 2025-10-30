import { getAllDartCorpCodes } from "@/core/infrastructure/dart.infra";
import { getKospiCodes } from "@/core/services/krx.service";
import { DartCorp } from "@/core/types/dart.type";

/**
 * @fileoverview KOSPI 상장 기업의 DART corpCode 캐시 관리 서비스
 * `globalThis`를 사용하여 Next.js 개발 환경의 Hot Reloading에서도 캐시가 유지되도록 구현
 */

// 1. globalThis에 캐시 객체의 타입을 선언
declare global {
  var kospiCorpsCache: DartCorp[];
}

// 2. 캐시 초기화
globalThis.kospiCorpsCache = globalThis.kospiCorpsCache || [];

/**
 * 캐시된 KOSPI 기업 corpCode 목록을 반환합니다.
 * @returns 캐시된 KOSPI 기업 정보 배열
 */
export function getKospiCorps(): DartCorp[] {
  return globalThis.kospiCorpsCache;
}

/**
 * KOSPI 상장 기업의 DART corpCode를 수집하고 메모리에 캐싱합니다.
 *
 * 프로세스:
 * 1. KRX에서 KOSPI 종목 코드 목록 가져오기
 * 2. DART에서 전체 기업 목록 가져오기
 * 3. 두 데이터를 매칭하여 KOSPI 상장 기업만 필터링
 * 4. globalThis에 캐싱
 *
 * @returns KOSPI 상장 기업의 DART 정보 배열
 */
export async function fetchAndCacheKospiCorps(): Promise<DartCorp[]> {
  console.log("[KospiCorpService] Fetching KOSPI listed corporations...");

  // 1. KOSPI 종목 코드 목록 가져오기
  const kospiCodes = getKospiCodes();

  if (kospiCodes.length === 0) {
    console.warn("[KospiCorpService] KOSPI codes cache is empty. Please fetch KOSPI codes first.");
    return [];
  }

  // 2. DART에서 전체 기업 목록 가져오기
  const allCorps = await getAllDartCorpCodes();

  // 3. KOSPI 종목 코드 Set 생성 (O(1) 조회를 위한 최적화)
  const kospiSymbolSet = new Set(kospiCodes.map((code) => code.symbol));

  // 4. KOSPI 종목과 매칭되는 기업만 필터링
  const kospiCorps = allCorps.filter((corp) => {
    if (!corp.stockCode) return false;

    // DART의 stockCode를 6자리 문자열로 변환 (앞에 0 패딩)
    const paddedStockCode = String(corp.stockCode).padStart(6, "0");

    return kospiSymbolSet.has(paddedStockCode);
  });

  // 5. 메모리에 캐싱
  globalThis.kospiCorpsCache = kospiCorps;

  console.log(`[KospiCorpService] Successfully fetched and cached ${kospiCorps.length} KOSPI corporations from ${allCorps.length} total`);

  return kospiCorps;
}
