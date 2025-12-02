import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/core/infrastructure/common/supabase.infra";

/**
 * 특정 기업의 분기별 재무지표 히스토리 조회 API
 *
 * @query corpCode - 기업 고유 코드
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const corpCode = searchParams.get("corpCode");

  if (!corpCode) {
    return NextResponse.json(
      {
        success: false,
        error: "corpCode parameter is required",
      },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.from("financial_metrics").select("*").eq("corp_code", corpCode).order("year", { ascending: true }).order("quarter", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      data: data || [],
    });
  } catch (error) {
    console.error("[API] Failed to fetch financial metrics history:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch financial metrics history",
      },
      { status: 500 }
    );
  }
}
