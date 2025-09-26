import { NextResponse } from "next/server";
import { fetchMKSitemap } from "@/core/infrastructure/news.infra";
import { parseMKSitemap } from "@/core/services/news.service";

const MK_SITEMAP_URL = "https://www.mk.co.kr/sitemap/latest-articles";
const ALLOWED_SECTIONS = ["economy", "business", "realestate", "stock", "it", "politics"];

export async function GET() {
  try {
    // 1. 매경 사이트맵 XML 데이터 가져오기
    const xmlData = await fetchMKSitemap(MK_SITEMAP_URL);

    // 2. XML을 파싱하고, 지정된 섹션으로 필터링하여 News[] 엔티티 배열로 변환
    const news = parseMKSitemap(xmlData, ALLOWED_SECTIONS);

    // 3. 콘솔에 최종 변환된 News 엔티티 배열 로그 출력
    console.log("[/api/news] Transformed News Entities:", JSON.stringify(news, null, 2));

    // 4. 변환된 결과를 클라이언트에 반환
    return NextResponse.json({ data: news });
  } catch (error) {
    console.error(`[api/news] Error:`, error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
