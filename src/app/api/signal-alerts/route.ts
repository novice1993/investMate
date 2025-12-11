import { NextResponse } from "next/server";
import { getRecentAlerts, getUnreadCount, markAllAlertsAsRead } from "@/core/infrastructure/market/signal-alerts-repository.infra";

/**
 * 시그널 알림 API
 *
 * GET /api/signal-alerts - 최근 알림 목록 + 읽지 않은 개수 조회
 * POST /api/signal-alerts - 모든 알림 읽음 처리
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // includeMock은 환경변수 MOCK_SIGNAL_ENABLED에 따라 자동 결정됨
    const [alerts, unreadCount] = await Promise.all([getRecentAlerts({ limit }), getUnreadCount()]);

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        unreadCount,
      },
    });
  } catch (error) {
    console.error("[API] Signal alerts fetch failed:", error);

    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const success = await markAllAlertsAsRead();

    return NextResponse.json({
      success,
      message: success ? "All alerts marked as read" : "Failed to mark alerts as read",
    });
  } catch (error) {
    console.error("[API] Mark all alerts as read failed:", error);

    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
