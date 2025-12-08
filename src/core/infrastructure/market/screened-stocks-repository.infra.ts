import { getSupabaseClient } from "@/core/infrastructure/common/supabase.infra";

/**
 * @fileoverview 스크리닝된 종목 Supabase Repository
 *
 * DELETE → INSERT 전략: 매번 전체 교체하여 누적 방지
 * (KIS WebSocket 구독 제한 대응)
 */

// ============================================================================
// Types
// ============================================================================

interface ScreenedStockRow {
  id?: number;
  stock_code: string;
  corp_code: string;
  corp_name: string;
  market_cap: number;
  roe: number;
  debt_ratio: number;
  operating_margin: number;
  created_at?: string;
}

export interface ScreenedStockData {
  stockCode: string;
  corpCode: string;
  corpName: string;
  marketCap: number;
  roe: number;
  debtRatio: number;
  operatingMargin: number;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * 스크리닝된 종목 목록을 저장합니다.
 * 기존 데이터를 모두 삭제하고 새로운 데이터로 교체합니다.
 */
export async function replaceScreenedStocks(stocks: ScreenedStockData[]): Promise<void> {
  if (stocks.length === 0) {
    console.warn("[Screened Stocks Repository] 저장할 종목이 없습니다.");
    return;
  }

  const supabase = getSupabaseClient();

  // 1. 기존 데이터 전체 삭제
  const { error: deleteError } = await supabase.from("screened_stocks").delete().neq("id", 0);

  if (deleteError) {
    console.error("[Screened Stocks Repository] 삭제 오류:", deleteError);
    throw deleteError;
  }

  // 2. 새 데이터 삽입
  const rows = stocks.map(mapToRow);
  const { error: insertError } = await supabase.from("screened_stocks").insert(rows);

  if (insertError) {
    console.error("[Screened Stocks Repository] 삽입 오류:", insertError);
    throw insertError;
  }

  console.log(`[Screened Stocks Repository] ${stocks.length}개 종목 저장 완료`);
}

/**
 * 현재 스크리닝된 종목 목록을 조회합니다.
 */
export async function getScreenedStocks(): Promise<ScreenedStockData[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from("screened_stocks").select("*").order("market_cap", { ascending: false });

  if (error) {
    console.error("[Screened Stocks Repository] 조회 오류:", error);
    throw error;
  }

  return (data || []).map(mapToEntity);
}

/**
 * 스크리닝된 종목 코드 목록만 조회합니다 (WebSocket 구독용).
 */
export async function getScreenedStockCodes(): Promise<string[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from("screened_stocks").select("stock_code");

  if (error) {
    console.error("[Screened Stocks Repository] 종목코드 조회 오류:", error);
    throw error;
  }

  return (data || []).map((row) => row.stock_code);
}

// ============================================================================
// Private Helpers
// ============================================================================

function mapToRow(stock: ScreenedStockData): Omit<ScreenedStockRow, "id" | "created_at"> {
  return {
    stock_code: stock.stockCode,
    corp_code: stock.corpCode,
    corp_name: stock.corpName,
    market_cap: stock.marketCap,
    roe: stock.roe,
    debt_ratio: stock.debtRatio,
    operating_margin: stock.operatingMargin,
  };
}

function mapToEntity(row: ScreenedStockRow): ScreenedStockData {
  return {
    stockCode: row.stock_code,
    corpCode: row.corp_code,
    corpName: row.corp_name,
    marketCap: row.market_cap,
    roe: row.roe,
    debtRatio: row.debt_ratio,
    operatingMargin: row.operating_margin,
  };
}
