import { NextResponse } from "next/server";
import { markAlertAsRead } from "@/core/infrastructure/market/signal-alerts-repository.infra";

/**
 * 개별 시그널 알림 API
 *
 * PATCH /api/signal-alerts/[alertId] - 특정 알림 읽음 처리
 */

interface RouteParams {
  params: Promise<{ alertId: string }>;
}

export async function PATCH(_request: Request, { params }: RouteParams) {
  try {
    const { alertId } = await params;

    if (!alertId) {
      return NextResponse.json({ success: false, error: "Alert ID is required" }, { status: 400 });
    }

    const success = await markAlertAsRead(alertId);

    return NextResponse.json({
      success,
      message: success ? "Alert marked as read" : "Failed to mark alert as read",
    });
  } catch (error) {
    console.error("[API] Mark alert as read failed:", error);

    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
