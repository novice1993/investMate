import { NextRequest, NextResponse } from "next/server";
import { summarizeDisclosure } from "@/core/services/disclosure-summarizer.service";

/**
 * 공시 요약 API
 *
 * GET /api/disclosures/[receiptNo]/summary
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ receiptNo: string }> }) {
  try {
    const { receiptNo } = await params;

    if (!receiptNo) {
      return NextResponse.json({ success: false, error: "receiptNo is required" }, { status: 400 });
    }

    const result = await summarizeDisclosure(receiptNo);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[API] Failed to summarize disclosure:", error);
    return NextResponse.json({ success: false, error: "Failed to summarize disclosure" }, { status: 500 });
  }
}
