import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

/**
 * KOSPI 전체 종목 목록 조회 API
 *
 * GET /api/kospi-stocks
 */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "kospi_corp_mapping.json");
    const fileContent = await readFile(filePath, "utf-8");
    const stocks = JSON.parse(fileContent);

    // 필요한 필드만 추출 (클라이언트 전송량 최소화)
    const simplified = stocks.map((s: { corpCode: string; corpName: string; stockCode: string; market: string; marketCap: number }) => ({
      corpCode: s.corpCode,
      corpName: s.corpName,
      stockCode: s.stockCode,
      market: s.market,
      marketCap: s.marketCap,
    }));

    return NextResponse.json(simplified);
  } catch (error) {
    console.error("[API] KOSPI stocks fetch failed:", error);

    return NextResponse.json({ error: "종목 데이터를 불러오는데 실패했습니다" }, { status: 500 });
  }
}
