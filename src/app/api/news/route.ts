import { NextResponse } from "next/server";
import { fetchNewsArticles } from "@/core/infrastructure/news/news-repository.infra";

// 10분마다 자동 재검증 (Cron 수집 주기와 동일)
export const revalidate = 600;

export async function GET() {
  try {
    const news = await fetchNewsArticles(100);

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
