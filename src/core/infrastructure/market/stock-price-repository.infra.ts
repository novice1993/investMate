import type { StockPrice } from "@/core/entities/stock-price.entity";
import { getSupabaseClient } from "@/core/infrastructure/common/supabase.infra";

/**
 * @fileoverview 주가 데이터 Supabase Repository
 *
 * 책임:
 * - stock_prices 테이블에 대한 CRUD 작업
 * - Upsert 전략으로 데이터 중복 방지 (날짜별 자동 갱신)
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Supabase stock_prices 테이블 Row 타입
 */
interface StockPriceRow {
  id?: number;
  stock_code: string;
  date: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  change: number;
  change_percent: number;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * 주가 데이터를 저장합니다 (Upsert: 존재하면 UPDATE, 없으면 INSERT)
 *
 * @param price 저장할 주가 데이터
 * @returns 저장된 데이터
 */
export async function upsertStockPrice(price: StockPrice): Promise<StockPriceRow> {
  const supabase = getSupabaseClient();
  const row = mapPriceToRow(price);

  const { data, error } = await supabase
    .from("stock_prices")
    .upsert(row, {
      onConflict: "stock_code,date", // Unique 제약 조건
    })
    .select()
    .single();

  if (error) {
    console.error("[Stock Price Repository] 저장 오류:", error);
    throw error;
  }

  return data;
}

/**
 * 여러 주가 데이터를 한 번에 저장합니다 (Bulk Upsert)
 *
 * @param prices 저장할 주가 데이터 배열
 * @returns 저장된 데이터 배열
 */
export async function upsertBulkStockPrices(prices: StockPrice[]): Promise<StockPriceRow[]> {
  if (prices.length === 0) {
    return [];
  }

  const supabase = getSupabaseClient();
  const rows = prices.map(mapPriceToRow);

  const { data, error } = await supabase
    .from("stock_prices")
    .upsert(rows, {
      onConflict: "stock_code,date",
    })
    .select();

  if (error) {
    console.error("[Stock Price Repository] 일괄 저장 오류:", error);
    throw error;
  }

  return data;
}

/**
 * 특정 종목의 특정 날짜 주가 데이터를 조회합니다
 *
 * @param stockCode 종목 코드
 * @param date 날짜 (YYYYMMDD)
 * @returns 주가 데이터 (없으면 null)
 */
export async function getStockPrice(stockCode: string, date: string): Promise<StockPriceRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from("stock_prices").select("*").eq("stock_code", stockCode).eq("date", date).maybeSingle();

  if (error) {
    console.error("[Stock Price Repository] 조회 오류:", error);
    throw error;
  }

  return data;
}

/**
 * 특정 종목의 주가 이력을 조회합니다 (날짜 범위)
 *
 * @param stockCode 종목 코드
 * @param startDate 시작 날짜 (YYYYMMDD)
 * @param endDate 종료 날짜 (YYYYMMDD)
 * @returns 주가 데이터 배열 (날짜 내림차순)
 */
export async function getStockPricesByDateRange(stockCode: string, startDate: string, endDate: string): Promise<StockPriceRow[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from("stock_prices").select("*").eq("stock_code", stockCode).gte("date", startDate).lte("date", endDate).order("date", { ascending: false });

  if (error) {
    console.error("[Stock Price Repository] 날짜 범위 조회 오류:", error);
    throw error;
  }

  return data || [];
}

/**
 * 특정 종목의 최근 N일 주가 데이터를 조회합니다
 *
 * @param stockCode 종목 코드
 * @param limit 최대 조회 개수 (기본: 100)
 * @returns 주가 데이터 배열 (날짜 내림차순)
 */
export async function getRecentStockPrices(stockCode: string, limit: number = 100): Promise<StockPriceRow[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from("stock_prices").select("*").eq("stock_code", stockCode).order("date", { ascending: false }).limit(limit);

  if (error) {
    console.error("[Stock Price Repository] 최근 주가 조회 오류:", error);
    throw error;
  }

  return data || [];
}

/**
 * 특정 날짜의 전체 종목 주가 데이터를 조회합니다
 *
 * @param date 날짜 (YYYYMMDD)
 * @returns 주가 데이터 배열
 */
export async function getStockPricesByDate(date: string): Promise<StockPriceRow[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from("stock_prices").select("*").eq("date", date).order("stock_code");

  if (error) {
    console.error("[Stock Price Repository] 날짜별 조회 오류:", error);
    throw error;
  }

  return data || [];
}

/**
 * 특정 종목의 주가 데이터가 존재하는지 확인합니다
 *
 * @param stockCode 종목 코드
 * @param date 날짜 (YYYYMMDD)
 * @returns 존재 여부
 */
export async function checkStockPriceExists(stockCode: string, date: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from("stock_prices").select("id").eq("stock_code", stockCode).eq("date", date).maybeSingle();

  if (error) {
    console.error("[Stock Price Repository] 존재 확인 오류:", error);
    throw error;
  }

  return data !== null;
}

/**
 * 특정 종목의 가장 최근 주가 날짜를 조회합니다
 *
 * @param stockCode 종목 코드
 * @returns 최근 날짜 (YYYYMMDD) 또는 null
 */
export async function getLatestStockPriceDate(stockCode: string): Promise<string | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from("stock_prices").select("date").eq("stock_code", stockCode).order("date", { ascending: false }).limit(1).maybeSingle();

  if (error) {
    console.error("[Stock Price Repository] 최근 날짜 조회 오류:", error);
    throw error;
  }

  return data?.date || null;
}

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * StockPrice 엔티티를 Supabase Row 형식으로 변환합니다
 */
function mapPriceToRow(price: StockPrice): Omit<StockPriceRow, "id" | "created_at" | "updated_at"> {
  return {
    stock_code: price.stockCode,
    date: price.date,
    open_price: price.openPrice,
    high_price: price.highPrice,
    low_price: price.lowPrice,
    close_price: price.closePrice,
    volume: price.volume,
    change: price.change,
    change_percent: price.changePercent,
  };
}
