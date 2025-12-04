import { getSupabaseClient } from "@/core/infrastructure/common/supabase.infra";

/**
 * @fileoverview 주식 밸류에이션 (PER/PBR/EPS/BPS) Supabase Repository
 */

// ============================================================================
// Types
// ============================================================================

interface StockValuationRow {
  id?: number;
  stock_code: string;
  corp_name: string;
  date: string;
  per: number | null;
  pbr: number | null;
  eps: number | null;
  bps: number | null;
  current_price: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface StockValuation {
  stockCode: string;
  corpName: string;
  date: string;
  per: number | null;
  pbr: number | null;
  eps: number | null;
  bps: number | null;
  currentPrice: number | null;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * 주식 밸류에이션 데이터를 저장합니다 (Upsert)
 */
export async function upsertStockValuation(valuation: StockValuation): Promise<void> {
  const supabase = getSupabaseClient();
  const row = mapToRow(valuation);

  const { error } = await supabase.from("stock_valuation").upsert(row, {
    onConflict: "stock_code,date",
  });

  if (error) {
    console.error("[Stock Valuation Repository] 저장 오류:", error);
    throw error;
  }
}

/**
 * 여러 주식 밸류에이션 데이터를 한 번에 저장합니다 (Bulk Upsert)
 */
export async function upsertBulkStockValuation(valuations: StockValuation[]): Promise<void> {
  if (valuations.length === 0) {
    return;
  }

  const supabase = getSupabaseClient();
  const rows = valuations.map(mapToRow);

  const { error } = await supabase.from("stock_valuation").upsert(rows, {
    onConflict: "stock_code,date",
  });

  if (error) {
    console.error("[Stock Valuation Repository] 일괄 저장 오류:", error);
    throw error;
  }
}

/**
 * 특정 날짜의 전체 밸류에이션 데이터를 조회합니다
 */
export async function getStockValuationByDate(date: string): Promise<StockValuation[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from("stock_valuation").select("*").eq("date", date);

  if (error) {
    console.error("[Stock Valuation Repository] 조회 오류:", error);
    throw error;
  }

  return (data || []).map(mapToEntity);
}

/**
 * 특정 종목의 최신 밸류에이션 데이터를 조회합니다
 */
export async function getLatestStockValuation(stockCode: string): Promise<StockValuation | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from("stock_valuation").select("*").eq("stock_code", stockCode).order("date", { ascending: false }).limit(1).maybeSingle();

  if (error) {
    console.error("[Stock Valuation Repository] 조회 오류:", error);
    throw error;
  }

  return data ? mapToEntity(data) : null;
}

// ============================================================================
// Private Helpers
// ============================================================================

function mapToRow(valuation: StockValuation): Omit<StockValuationRow, "id" | "created_at" | "updated_at"> {
  return {
    stock_code: valuation.stockCode,
    corp_name: valuation.corpName,
    date: valuation.date,
    per: valuation.per,
    pbr: valuation.pbr,
    eps: valuation.eps,
    bps: valuation.bps,
    current_price: valuation.currentPrice,
  };
}

function mapToEntity(row: StockValuationRow): StockValuation {
  return {
    stockCode: row.stock_code,
    corpName: row.corp_name,
    date: row.date,
    per: row.per,
    pbr: row.pbr,
    eps: row.eps,
    bps: row.bps,
    currentPrice: row.current_price,
  };
}
