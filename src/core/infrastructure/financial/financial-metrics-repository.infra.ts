import { getSupabaseClient } from "@/core/infrastructure/common/supabase.infra";
import { FinancialMetrics } from "@/core/services/financial-analysis.service";

/**
 * @fileoverview 재무 지표 Supabase Repository
 *
 * 책임:
 * - financial_metrics 테이블에 대한 CRUD 작업
 * - Upsert 전략으로 데이터 중복 방지
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Supabase financial_metrics 테이블 Row 타입
 */
interface FinancialMetricsRow {
  id?: number;
  corp_code: string;
  corp_name: string;
  stock_code: string;
  year: string;
  quarter: number;
  revenue: number;
  operating_profit: number;
  net_income: number;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  revenue_yoy: number;
  operating_profit_yoy: number;
  net_income_yoy: number;
  roe: number;
  debt_ratio: number;
  operating_margin: number;
  net_margin: number;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * 재무 지표를 저장합니다 (Upsert: 존재하면 UPDATE, 없으면 INSERT)
 *
 * @param metrics 저장할 재무 지표
 * @returns 저장된 데이터
 */
export async function upsertFinancialMetrics(metrics: FinancialMetrics): Promise<FinancialMetricsRow> {
  const supabase = getSupabaseClient();
  const row = mapMetricsToRow(metrics);

  const { data, error } = await supabase
    .from("financial_metrics")
    .upsert(row, {
      onConflict: "corp_code,year,quarter", // Unique 제약 조건
    })
    .select()
    .single();

  if (error) {
    console.error("[Financial Metrics Repository] 저장 오류:", error);
    throw error;
  }

  return data;
}

/**
 * 여러 재무 지표를 한 번에 저장합니다 (Bulk Upsert)
 *
 * @param metricsList 저장할 재무 지표 배열
 * @returns 저장된 데이터 배열
 */
export async function upsertBulkFinancialMetrics(metricsList: FinancialMetrics[]): Promise<FinancialMetricsRow[]> {
  if (metricsList.length === 0) {
    return [];
  }

  const supabase = getSupabaseClient();
  const rows = metricsList.map(mapMetricsToRow);

  const { data, error } = await supabase
    .from("financial_metrics")
    .upsert(rows, {
      onConflict: "corp_code,year,quarter",
    })
    .select();

  if (error) {
    console.error("[Financial Metrics Repository] 일괄 저장 오류:", error);
    throw error;
  }

  return data;
}

/**
 * 특정 기업의 특정 연도/분기 재무 지표를 조회합니다
 *
 * @param corpCode 기업 고유번호
 * @param year 연도
 * @param quarter 분기
 * @returns 재무 지표 (없으면 null)
 */
export async function getFinancialMetrics(corpCode: string, year: string, quarter: number): Promise<FinancialMetricsRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from("financial_metrics").select("*").eq("corp_code", corpCode).eq("year", year).eq("quarter", quarter).maybeSingle();

  if (error) {
    console.error("[Financial Metrics Repository] 조회 오류:", error);
    throw error;
  }

  return data;
}

/**
 * 특정 기업의 전체 재무 지표 이력을 조회합니다
 *
 * @param corpCode 기업 고유번호
 * @param limit 최대 조회 개수 (기본: 20)
 * @returns 재무 지표 배열 (최신순)
 */
export async function getFinancialMetricsByCorpCode(corpCode: string, limit: number = 20): Promise<FinancialMetricsRow[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from("financial_metrics").select("*").eq("corp_code", corpCode).order("year", { ascending: false }).order("quarter", { ascending: false }).limit(limit);

  if (error) {
    console.error("[Financial Metrics Repository] 기업별 조회 오류:", error);
    throw error;
  }

  return data || [];
}

/**
 * 특정 종목 코드의 전체 재무 지표 이력을 조회합니다
 *
 * @param stockCode 종목 코드
 * @param limit 최대 조회 개수 (기본: 20)
 * @returns 재무 지표 배열 (최신순)
 */
export async function getFinancialMetricsByStockCode(stockCode: string, limit: number = 20): Promise<FinancialMetricsRow[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from("financial_metrics").select("*").eq("stock_code", stockCode).order("year", { ascending: false }).order("quarter", { ascending: false }).limit(limit);

  if (error) {
    console.error("[Financial Metrics Repository] 종목별 조회 오류:", error);
    throw error;
  }

  return data || [];
}

/**
 * 특정 연도/분기의 전체 기업 재무 지표를 조회합니다
 *
 * @param year 연도
 * @param quarter 분기
 * @returns 재무 지표 배열
 */
export async function getFinancialMetricsByYearQuarter(year: string, quarter: number): Promise<FinancialMetricsRow[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from("financial_metrics").select("*").eq("year", year).eq("quarter", quarter).order("corp_code");

  if (error) {
    console.error("[Financial Metrics Repository] 연도/분기별 조회 오류:", error);
    throw error;
  }

  return data || [];
}

/**
 * 재무 지표가 이미 존재하는지 확인합니다
 *
 * @param corpCode 기업 고유번호
 * @param year 연도
 * @param quarter 분기
 * @returns 존재 여부
 */
export async function checkFinancialMetricsExists(corpCode: string, year: string, quarter: number): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from("financial_metrics").select("id").eq("corp_code", corpCode).eq("year", year).eq("quarter", quarter).maybeSingle();

  if (error) {
    console.error("[Financial Metrics Repository] 존재 확인 오류:", error);
    throw error;
  }

  return data !== null;
}

/**
 * 최신 재무 지표를 조회합니다 (시그널 스크리닝용)
 *
 * @param year 연도
 * @param quarter 분기 번호 (1-4)
 * @returns 스크리닝용 재무 지표 배열
 */
export async function getLatestFinancialMetrics(
  year: string,
  quarter: number
): Promise<{ corpCode: string; stockCode: string; corpName: string; roe: number; debtRatio: number; operatingMargin: number }[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from("financial_metrics").select("corp_code, stock_code, corp_name, roe, debt_ratio, operating_margin").eq("year", year).eq("quarter", quarter);

  if (error) {
    console.error("[Financial Metrics Repository] 최신 지표 조회 오류:", error);
    throw error;
  }

  return (data || []).map((row) => ({
    corpCode: row.corp_code,
    stockCode: row.stock_code,
    corpName: row.corp_name,
    roe: row.roe,
    debtRatio: row.debt_ratio,
    operatingMargin: row.operating_margin,
  }));
}

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * FinancialMetrics 엔티티를 Supabase Row 형식으로 변환합니다
 */
function mapMetricsToRow(metrics: FinancialMetrics): Omit<FinancialMetricsRow, "id" | "created_at" | "updated_at"> {
  if (!metrics.stockCode) {
    throw new Error(`Stock code is required for corp_code: ${metrics.corpCode}`);
  }

  return {
    corp_code: metrics.corpCode,
    corp_name: metrics.corpName,
    stock_code: metrics.stockCode,
    year: metrics.year,
    quarter: metrics.quarter,
    revenue: metrics.revenue,
    operating_profit: metrics.operatingProfit,
    net_income: metrics.netIncome,
    total_assets: metrics.totalAssets,
    total_liabilities: metrics.totalLiabilities,
    total_equity: metrics.totalEquity,
    revenue_yoy: metrics.revenueYoY,
    operating_profit_yoy: metrics.operatingProfitYoY,
    net_income_yoy: metrics.netIncomeYoY,
    roe: metrics.roe,
    debt_ratio: metrics.debtRatio,
    operating_margin: metrics.operatingMargin,
    net_margin: metrics.netMargin,
  };
}
