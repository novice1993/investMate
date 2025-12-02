import type { StockPrice } from "@/core/entities/stock-price.entity";
import { getSupabaseClient } from "@/core/infrastructure/common/supabase.infra";

/**
 * @fileoverview 일봉 데이터 Supabase Repository
 *
 * 책임:
 * - daily_prices 테이블에 대한 CRUD 작업
 * - 종목별 전체 교체 전략 (DELETE → INSERT)
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Supabase daily_prices 테이블 Row 타입
 */
export interface DailyPriceRow {
  id?: number;
  stock_code: string;
  date: string; // YYYYMMDD
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  change_amount: number;
  change_percent: number;
  created_at?: string;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * 특정 종목의 일봉 데이터를 전체 교체합니다 (DELETE → INSERT)
 *
 * @param stockCode 종목 코드
 * @param prices 저장할 일봉 데이터 배열
 * @returns 저장된 데이터 개수
 */
export async function replaceDailyPrices(stockCode: string, prices: StockPrice[]): Promise<number> {
  if (prices.length === 0) {
    return 0;
  }

  const supabase = getSupabaseClient();

  // 1. 기존 데이터 삭제
  const { error: deleteError } = await supabase.from("daily_prices").delete().eq("stock_code", stockCode);

  if (deleteError) {
    console.error(`[Daily Prices Repository] 삭제 오류 (${stockCode}):`, deleteError);
    throw deleteError;
  }

  // 2. 신규 데이터 삽입
  const rows = prices.map(mapPriceToRow);

  const { error: insertError } = await supabase.from("daily_prices").insert(rows);

  if (insertError) {
    console.error(`[Daily Prices Repository] 삽입 오류 (${stockCode}):`, insertError);
    throw insertError;
  }

  return prices.length;
}

/**
 * 특정 종목의 일봉 데이터를 조회합니다 (차트용 - 과거→최신 순)
 *
 * @param stockCode 종목 코드
 * @param limit 최대 조회 개수 (기본: 100)
 * @returns 일봉 데이터 배열
 */
export async function getDailyPrices(stockCode: string, limit: number = 100): Promise<StockPrice[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from("daily_prices").select("*").eq("stock_code", stockCode).order("date", { ascending: true }).limit(limit);

  if (error) {
    console.error(`[Daily Prices Repository] 조회 오류 (${stockCode}):`, error);
    throw error;
  }

  return (data || []).map(mapRowToPrice);
}

/**
 * 특정 종목의 일봉 데이터 존재 여부를 확인합니다
 *
 * @param stockCode 종목 코드
 * @returns 존재 여부
 */
export async function checkDailyPricesExists(stockCode: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from("daily_prices").select("id").eq("stock_code", stockCode).limit(1).maybeSingle();

  if (error) {
    console.error(`[Daily Prices Repository] 존재 확인 오류 (${stockCode}):`, error);
    throw error;
  }

  return data !== null;
}

/**
 * 전체 일봉 데이터 통계를 조회합니다
 *
 * @returns 총 레코드 수, 종목 수
 */
export async function getDailyPricesStats(): Promise<{ totalRecords: number; totalStocks: number }> {
  const supabase = getSupabaseClient();

  const { count, error } = await supabase.from("daily_prices").select("*", { count: "exact", head: true });

  if (error) {
    console.error("[Daily Prices Repository] 통계 조회 오류:", error);
    throw error;
  }

  // 고유 종목 수 조회
  const { data: stocksData, error: stocksError } = await supabase.from("daily_prices").select("stock_code").limit(10000);

  if (stocksError) {
    console.error("[Daily Prices Repository] 종목 수 조회 오류:", stocksError);
    throw stocksError;
  }

  const uniqueStocks = new Set(stocksData?.map((d) => d.stock_code) || []);

  return {
    totalRecords: count || 0,
    totalStocks: uniqueStocks.size,
  };
}

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * StockPrice 엔티티를 Supabase Row 형식으로 변환합니다
 */
function mapPriceToRow(price: StockPrice): Omit<DailyPriceRow, "id" | "created_at"> {
  return {
    stock_code: price.stockCode,
    date: price.date,
    open_price: price.openPrice,
    high_price: price.highPrice,
    low_price: price.lowPrice,
    close_price: price.closePrice,
    volume: price.volume,
    change_amount: price.change,
    change_percent: price.changePercent,
  };
}

/**
 * Supabase Row를 StockPrice 엔티티로 변환합니다
 */
function mapRowToPrice(row: DailyPriceRow): StockPrice {
  return {
    stockCode: row.stock_code,
    date: row.date,
    openPrice: row.open_price,
    highPrice: row.high_price,
    lowPrice: row.low_price,
    closePrice: row.close_price,
    volume: row.volume,
    change: row.change_amount,
    changePercent: row.change_percent,
  };
}
