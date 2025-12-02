import { NextResponse } from "next/server";
import { getDailyPrices } from "@/core/infrastructure/market/daily-prices.repository";

/**
 * 특정 종목의 일봉 데이터 조회 API
 *
 * GET /api/stocks/[stockCode]/daily-prices
 */
export async function GET(request: Request, { params }: { params: Promise<{ stockCode: string }> }) {
  try {
    const { stockCode } = await params;

    // 종목코드 유효성 검사
    if (!stockCode || stockCode.length !== 6 || isNaN(Number(stockCode))) {
      return NextResponse.json({ success: false, error: "유효하지 않은 종목코드입니다" }, { status: 400 });
    }

    const prices = await getDailyPrices(stockCode);

    return NextResponse.json({
      success: true,
      data: prices,
      count: prices.length,
    });
  } catch (error) {
    console.error("[API] Daily prices fetch failed:", error);

    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
