import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/core/infrastructure/supabase.infra";

// 1시간마다 자동 재검증 (Supabase에서 최신 데이터 조회)
export const revalidate = 3600;

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    const { data: news, error } = await supabase.from("news_articles").select("*").order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Supabase 조회 실패: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: news,
      count: news?.length || 0,
    });
  } catch (error) {
    console.error(`[api/news] Error:`, error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
