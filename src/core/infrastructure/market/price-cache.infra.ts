/**
 * @fileoverview 일봉 데이터 메모리 캐시
 *
 * 서버 시작 시 선별 종목의 일봉 데이터를 메모리에 캐싱하고,
 * 실시간 체결가를 반영하여 시그널 트리거 계산에 활용합니다.
 */

import type { StockPrice, RealtimePrice } from "@/core/entities/stock-price.entity";
import { getDailyPrices } from "./daily-prices-repository.infra";
import { getScreenedStockCodes } from "./screened-stocks-repository.infra";

// ============================================================================
// Types
// ============================================================================

interface CachedPriceData {
  /** 일봉 데이터 (과거 → 최신 순) */
  dailyPrices: StockPrice[];
  /** 당일 실시간 데이터 (마지막 체결가) */
  realtimePrice: RealtimePrice | null;
}

// ============================================================================
// Cache Storage
// ============================================================================

/** 종목별 가격 데이터 캐시 */
const priceCache = new Map<string, CachedPriceData>();

// ============================================================================
// Public API
// ============================================================================

/**
 * 선별 종목의 일봉 데이터를 메모리에 캐싱합니다.
 * 서버 시작 시 호출됩니다.
 */
export async function initializePriceCache(): Promise<void> {
  console.log("[PriceCache] 초기화 시작...");

  const stockCodes = await getScreenedStockCodes();
  console.log(`[PriceCache] ${stockCodes.length}개 종목 일봉 데이터 로딩 중...`);

  let successCount = 0;
  let failCount = 0;

  for (const stockCode of stockCodes) {
    try {
      const dailyPrices = await getDailyPrices(stockCode, 60); // 최근 60일
      priceCache.set(stockCode, {
        dailyPrices,
        realtimePrice: null,
      });
      successCount++;
    } catch (error) {
      console.error(`[PriceCache] ${stockCode} 로딩 실패:`, error);
      failCount++;
    }
  }

  console.log(`[PriceCache] 초기화 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
}

/**
 * 실시간 체결가를 캐시에 반영합니다.
 */
export function updateRealtimePrice(realtimePrice: RealtimePrice): void {
  const cached = priceCache.get(realtimePrice.stockCode);
  if (cached) {
    cached.realtimePrice = realtimePrice;
  }
}

/**
 * 시그널 계산용 가격 데이터를 반환합니다.
 * 일봉 데이터 + 실시간 체결가를 조합합니다.
 */
export function getPriceDataForSignal(stockCode: string): StockPrice[] | null {
  const cached = priceCache.get(stockCode);
  if (!cached || cached.dailyPrices.length === 0) {
    return null;
  }

  const { dailyPrices, realtimePrice } = cached;

  // 실시간 데이터가 없으면 일봉만 반환
  if (!realtimePrice) {
    return dailyPrices;
  }

  // 실시간 데이터를 가상의 당일 일봉으로 변환하여 추가
  const todayPrice: StockPrice = {
    stockCode: realtimePrice.stockCode,
    date: new Date().toISOString().slice(0, 10).replace(/-/g, ""), // YYYYMMDD
    openPrice: realtimePrice.price, // 시가는 현재가로 대체 (정확하지 않음)
    highPrice: realtimePrice.price,
    lowPrice: realtimePrice.price,
    closePrice: realtimePrice.price,
    volume: realtimePrice.volume,
    change: realtimePrice.change,
    changePercent: realtimePrice.changeRate,
  };

  // 마지막 일봉과 날짜가 같으면 교체, 다르면 추가
  const lastDaily = dailyPrices[dailyPrices.length - 1];
  if (lastDaily && lastDaily.date === todayPrice.date) {
    return [...dailyPrices.slice(0, -1), todayPrice];
  }

  return [...dailyPrices, todayPrice];
}

/**
 * 캐시된 모든 종목 코드를 반환합니다.
 */
export function getCachedStockCodes(): string[] {
  return Array.from(priceCache.keys());
}

/**
 * 캐시를 초기화합니다.
 */
export function clearPriceCache(): void {
  priceCache.clear();
  console.log("[PriceCache] 캐시 초기화됨");
}

/**
 * 캐시 상태를 반환합니다.
 */
export function getPriceCacheStats(): { stockCount: number; totalPrices: number } {
  let totalPrices = 0;
  for (const cached of priceCache.values()) {
    totalPrices += cached.dailyPrices.length;
  }

  return {
    stockCount: priceCache.size,
    totalPrices,
  };
}
