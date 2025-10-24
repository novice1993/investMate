import { NextResponse } from "next/server";
import { runNewsCollectionWorkflow } from "@/core/workflows/news";

/**
 * @fileoverview 뉴스 수집 워크플로우를 실행하는 API 엔드포인트
 * Render Cron Job에서 주기적으로 호출하여 자동으로 뉴스를 수집합니다.
 * 상세 결과는 서버 로그에서 확인 가능합니다.
 *
 * @example
 * curl -X GET https://your-domain.com/api/workflows/news-collect
 */

export async function GET() {
  console.log("[API] 뉴스 수집 워크플로우 시작");

  try {
    const result = await runNewsCollectionWorkflow();
    console.log("[API] 뉴스 수집 완료:", result);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[API] 치명적 오류 발생:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
