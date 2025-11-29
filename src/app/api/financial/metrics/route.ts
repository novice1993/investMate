import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/core/infrastructure/common/supabase.infra";

/**
 * 재무지표 조회 API
 *
 * @query roeMin - ROE 최소값 (%)
 * @query roeMax - ROE 최대값 (%)
 * @query debtRatioMax - 부채비율 최대값 (%)
 * @query limit - 조회 개수 (기본값: 100)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const roeMin = parseFloat(searchParams.get("roeMin") || "0");
  const roeMax = parseFloat(searchParams.get("roeMax") || "100");
  const debtRatioMax = parseFloat(searchParams.get("debtRatioMax") || "100");
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.from("financial_metrics").select("*").gte("roe", roeMin).lte("roe", roeMax).lte("debt_ratio", debtRatioMax).order("roe", { ascending: false }).limit(limit);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      data: data || [],
    });
  } catch (error) {
    console.error("[API] Failed to fetch financial metrics:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch financial metrics",
      },
      { status: 500 }
    );
  }
}
