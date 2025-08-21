import { NextRequest, NextResponse } from "next/server";
import { fetchRSSFeed } from "@/core/repositories/news.repository";
import { parseRSSFeed } from "@/core/services/news.service";

// RSS URL에서 데이터를 가져와서 파싱하는 조합 함수
async function fetchAndParseRSS(url: string) {
  const xmlData = await fetchRSSFeed(url);
  return await parseRSSFeed(xmlData);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "RSS URL이 필요합니다. ?url=파라미터를 추가해주세요." }, { status: 400 });
  }

  // URL 유효성 검사
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "유효하지 않은 URL입니다." }, { status: 400 });
  }

  try {
    const data = await fetchAndParseRSS(url);
    return NextResponse.json({
      url,
      data,
    });
  } catch (error) {
    console.error(`[api/news] Failed to fetch and parse RSS:`, error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
