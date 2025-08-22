import { NextRequest, NextResponse } from "next/server";
import { fetchRSSFeed } from "@/core/repositories/newsRepository";
import { parseRSSFeed } from "@/core/services/newsService";
import { apiCallWithLogging } from "@/shared/utils/api";

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

  const result = await apiCallWithLogging(() => fetchAndParseRSS(url), `RSS API - ${new URL(url).hostname}`);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    url,
    data: result.data,
  });
}
