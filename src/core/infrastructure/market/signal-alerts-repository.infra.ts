import { getSupabaseClient } from "@/core/infrastructure/common/supabase.infra";

/**
 * @fileoverview 시그널 알림 Supabase Repository
 *
 * 시그널 알림의 저장, 조회, 읽음 처리를 담당합니다.
 */

// ============================================================================
// Environment Config
// ============================================================================

/**
 * Mock 시그널 활성화 여부 확인 (함수 호출 시점에 평가)
 * - 조회 시 Mock 데이터 포함 여부의 기본값으로 사용
 */
function isMockSignalEnabled(): boolean {
  return process.env.MOCK_SIGNAL_ENABLED === "true";
}

// ============================================================================
// Types
// ============================================================================

interface SignalAlertRow {
  id: string;
  stock_code: string;
  rsi_oversold: boolean;
  golden_cross: boolean;
  volume_spike: boolean;
  rsi_value: number | null;
  volume_ratio: number | null;
  is_read: boolean;
  is_mock: boolean;
  created_at: string;
}

export interface SignalAlertData {
  id: string;
  stockCode: string;
  triggers: {
    rsiOversold: boolean;
    goldenCross: boolean;
    volumeSpike: boolean;
  };
  rsiValue: number | null;
  volumeRatio: number | null;
  isRead: boolean;
  isMock: boolean;
  createdAt: string;
}

interface SaveSignalAlertInput {
  stockCode: string;
  triggers: {
    rsiOversold: boolean;
    goldenCross: boolean;
    volumeSpike: boolean;
  };
  rsiValue?: number | null;
  volumeRatio?: number | null;
  /** Mock 시그널 여부 (기본값: false) */
  isMock?: boolean;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * 시그널 알림을 저장합니다.
 */
export async function saveSignalAlert(alert: SaveSignalAlertInput): Promise<SignalAlertData | null> {
  const supabase = getSupabaseClient();

  const row = {
    stock_code: alert.stockCode,
    rsi_oversold: alert.triggers.rsiOversold,
    golden_cross: alert.triggers.goldenCross,
    volume_spike: alert.triggers.volumeSpike,
    rsi_value: alert.rsiValue ?? null,
    volume_ratio: alert.volumeRatio ?? null,
    is_read: false,
    is_mock: alert.isMock ?? false,
  };

  const { data, error } = await supabase.from("signal_alerts").insert(row).select().single();

  if (error) {
    console.error("[Signal Alerts Repository] 저장 오류:", error);
    return null;
  }

  return mapToEntity(data);
}

interface GetRecentAlertsOptions {
  /** 조회할 알림 수 (기본 50개) */
  limit?: number;
  /** Mock 알림 포함 여부 (기본값: 환경변수 MOCK_SIGNAL_ENABLED) */
  includeMock?: boolean;
}

/**
 * 최근 알림 목록을 조회합니다.
 * - includeMock 기본값은 환경변수 MOCK_SIGNAL_ENABLED에 따라 결정
 */
export async function getRecentAlerts(options: GetRecentAlertsOptions = {}): Promise<SignalAlertData[]> {
  const { limit = 50, includeMock = isMockSignalEnabled() } = options;
  const supabase = getSupabaseClient();

  let query = supabase.from("signal_alerts").select("*").order("created_at", { ascending: false }).limit(limit);

  // Mock 알림 제외 (기본값)
  if (!includeMock) {
    query = query.eq("is_mock", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Signal Alerts Repository] 조회 오류:", error);
    throw error;
  }

  return (data || []).map(mapToEntity);
}

/**
 * 읽지 않은 알림 개수를 조회합니다.
 * @param includeMock Mock 알림 포함 여부 (기본값: 환경변수 MOCK_SIGNAL_ENABLED)
 */
export async function getUnreadCount(includeMock: boolean = isMockSignalEnabled()): Promise<number> {
  const supabase = getSupabaseClient();

  let query = supabase.from("signal_alerts").select("*", { count: "exact", head: true }).eq("is_read", false);

  if (!includeMock) {
    query = query.eq("is_mock", false);
  }

  const { count, error } = await query;

  if (error) {
    console.error("[Signal Alerts Repository] 카운트 조회 오류:", error);
    return 0;
  }

  return count || 0;
}

/**
 * 특정 알림을 읽음 처리합니다.
 */
export async function markAlertAsRead(alertId: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("signal_alerts").update({ is_read: true }).eq("id", alertId);

  if (error) {
    console.error("[Signal Alerts Repository] 읽음 처리 오류:", error);
    return false;
  }

  return true;
}

/**
 * 모든 알림을 읽음 처리합니다.
 */
export async function markAllAlertsAsRead(): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("signal_alerts").update({ is_read: true }).eq("is_read", false);

  if (error) {
    console.error("[Signal Alerts Repository] 전체 읽음 처리 오류:", error);
    return false;
  }

  return true;
}

// ============================================================================
// Private Helpers
// ============================================================================

function mapToEntity(row: SignalAlertRow): SignalAlertData {
  return {
    id: row.id,
    stockCode: row.stock_code,
    triggers: {
      rsiOversold: row.rsi_oversold,
      goldenCross: row.golden_cross,
      volumeSpike: row.volume_spike,
    },
    rsiValue: row.rsi_value,
    volumeRatio: row.volume_ratio,
    isRead: row.is_read,
    isMock: row.is_mock,
    createdAt: row.created_at,
  };
}
