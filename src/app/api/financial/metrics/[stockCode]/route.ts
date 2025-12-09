import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/core/infrastructure/common/supabase.infra";

/**
 * 단일 종목 재무지표 조회 API
 *
 * GET /api/financial/metrics/[stockCode]
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ stockCode: string }> }) {
  const { stockCode } = await params;

  if (!stockCode || stockCode.length !== 6) {
    return NextResponse.json({ success: false, error: "유효하지 않은 종목코드입니다" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseClient();

    // 최신 분기 데이터만 조회 (year, quarter 내림차순)
    const { data, error } = await supabase
      .from("financial_metrics")
      .select("*")
      .eq("stock_code", stockCode)
      .order("year", { ascending: false })
      .order("quarter", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ success: false, error: "해당 종목의 재무지표가 없습니다" }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: {
        stockCode: data.stock_code,
        corpName: data.corp_name,
        roe: data.roe,
        debtRatio: data.debt_ratio,
        operatingMargin: data.operating_margin,
        revenueGrowth: data.revenue_yoy,
        netIncomeGrowth: data.net_income_yoy,
        year: data.year,
        quarter: data.quarter,
        updatedAt: data.updated_at,
      },
    });
  } catch (error) {
    console.error("[API] Failed to fetch financial metrics:", error);

    return NextResponse.json({ success: false, error: "재무지표 조회에 실패했습니다" }, { status: 500 });
  }
}
