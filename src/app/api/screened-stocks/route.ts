import { NextResponse } from "next/server";
import { getScreenedStocks } from "@/core/infrastructure/market/screened-stocks-repository.infra";

/**
 * 선별된 종목 목록 조회 API
 *
 * GET /api/screened-stocks
 */
export async function GET() {
  try {
    const stocks = await getScreenedStocks();

    return NextResponse.json({
      success: true,
      data: stocks,
      count: stocks.length,
    });
  } catch (error) {
    console.error("[API] Screened stocks fetch failed:", error);

    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
