import { NextRequest, NextResponse } from "next/server";
import { getDisclosureList } from "@/core/infrastructure/financial/dart-disclosure.infra";

/**
 * 공시 목록 조회 API
 *
 * GET /api/disclosures?corpCode=xxx&limit=10
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const corpCode = searchParams.get("corpCode");
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    if (!corpCode) {
      return NextResponse.json({ success: false, error: "corpCode is required" }, { status: 400 });
    }

    const result = await getDisclosureList({
      corpCode,
      pageCount: Math.min(limit, 20), // 최대 20개로 제한
    });

    return NextResponse.json({
      success: true,
      data: {
        items: result.items,
        totalCount: result.totalCount,
      },
    });
  } catch (error) {
    console.error("[API] Failed to fetch disclosures:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch disclosures" }, { status: 500 });
  }
}
