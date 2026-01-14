"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { jsonHttpClient } from "@/shared/lib/http";
import { useSocketInstance } from "@/shared/providers/SocketProvider";

// ============================================================================
// Types
// ============================================================================

export interface SignalTriggers {
  rsiOversold: boolean;
  goldenCross: boolean;
  volumeSpike: boolean;
}

export interface SignalAlert {
  id?: string;
  stockCode: string;
  triggers: SignalTriggers;
  rsi: { latest: number | null } | null;
  crossover: { type: string; shortMA: number | null; longMA: number | null } | null;
  volumeSpike: { ratio: number; isSpike: boolean } | null;
  timestamp: string;
  isRead?: boolean;
  isMock?: boolean;
}

export interface SignalState {
  /** 종목별 현재 시그널 상태 */
  signals: Map<string, SignalTriggers>;
  /** 최근 알림 목록 (최대 50개) */
  recentAlerts: SignalAlert[];
  /** 읽지 않은 알림 개수 */
  unreadCount: number;
  /** RSI 과매도 종목 수 */
  rsiCount: number;
  /** 골든크로스 종목 수 */
  goldenCrossCount: number;
  /** 거래량 급등 종목 수 */
  volumeSpikeCount: number;
}

interface UseSignalAlertOptions {
  /** 새 시그널 발생 시 호출되는 콜백 */
  onNewAlert?: (alert: SignalAlert, corpName?: string) => void;
  /** 종목 코드 → 종목명 매핑 */
  stockNameMap?: Map<string, string>;
}

interface UseSignalAlertReturn extends SignalState {
  isConnected: boolean;
  isLoading: boolean;
  clearAlerts: () => void;
  markAsRead: (alertId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

// ============================================================================
// Types (API Response)
// ============================================================================

interface SignalAlertFromAPI {
  id: string;
  stockCode: string;
  triggers: SignalTriggers;
  rsiValue: number | null;
  volumeRatio: number | null;
  isRead: boolean;
  isMock: boolean;
  createdAt: string;
}

interface FetchAlertsResponse {
  success: boolean;
  data?: {
    alerts: SignalAlertFromAPI[];
    unreadCount: number;
  };
  error?: string;
}

interface MarkAsReadResponse {
  success: boolean;
  message?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_RECENT_ALERTS = 50;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * API 응답 형식을 내부 SignalAlert 형식으로 변환
 */
function mapAPIAlertToSignalAlert(apiAlert: SignalAlertFromAPI): SignalAlert {
  return {
    id: apiAlert.id,
    stockCode: apiAlert.stockCode,
    triggers: apiAlert.triggers,
    rsi: apiAlert.rsiValue !== null ? { latest: apiAlert.rsiValue } : null,
    crossover: null,
    volumeSpike: apiAlert.volumeRatio !== null ? { ratio: apiAlert.volumeRatio, isSpike: true } : null,
    timestamp: apiAlert.createdAt,
    isRead: apiAlert.isRead,
    isMock: apiAlert.isMock,
  };
}

// ============================================================================
// Hook
// ============================================================================

/**
 * 실시간 시그널 알림 훅
 * - 초기 로드: DB에서 저장된 알림 목록 불러오기
 * - 실시간: Socket.io로 새 알림 수신 시 목록 앞에 추가
 * - SocketProvider의 공유 Socket 인스턴스 사용
 */
export function useSignalAlert(options: UseSignalAlertOptions = {}): UseSignalAlertReturn {
  const { onNewAlert, stockNameMap } = options;
  const socket = useSocketInstance();
  const [signals, setSignals] = useState<Map<string, SignalTriggers>>(new Map());
  const [recentAlerts, setRecentAlerts] = useState<SignalAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const initialLoadDone = useRef(false);

  // 알림 목록 로드 함수 (초기 로드 + 스크리닝 완료 시 refetch)
  const loadAlerts = useCallback(async () => {
    try {
      const response = await jsonHttpClient.get<FetchAlertsResponse>("/api/signal-alerts");

      if (response.success && response.data) {
        const alerts = response.data.alerts.map(mapAPIAlertToSignalAlert);
        setRecentAlerts(alerts);
        setUnreadCount(response.data.unreadCount);
        return alerts.length;
      }
    } catch (error) {
      console.error("[SignalAlert] 알림 로드 실패:", error);
    }
    return 0;
  }, []);

  // DB에서 초기 알림 목록 로드
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    async function loadInitialAlerts() {
      const count = await loadAlerts();
      console.log("[SignalAlert] DB에서 초기 알림 로드:", count, "개");
      setIsLoading(false);
    }

    loadInitialAlerts();
  }, [loadAlerts]);

  // Socket.io 이벤트 핸들링
  useEffect(() => {
    if (!socket) return;

    // 이미 연결되어 있으면 상태 동기화
    setIsConnected(socket.connected);

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    // 초기 시그널 상태 수신 (서버에서 client-ready 응답으로 전송)
    const handleSignalStateInit = (initialState: Record<string, SignalTriggers>) => {
      console.log("[SignalAlert] 초기 상태 수신:", Object.keys(initialState).length, "개 종목");

      const stateMap = new Map<string, SignalTriggers>();
      for (const [stockCode, triggers] of Object.entries(initialState)) {
        stateMap.set(stockCode, triggers);
      }
      setSignals(stateMap);
    };

    // 실시간 시그널 알림 수신
    const handleSignalAlert = (alert: SignalAlert) => {
      console.log("[SignalAlert] 실시간 수신:", alert);

      // 시그널 상태 업데이트
      setSignals((prev) => {
        const next = new Map(prev);
        const existing = next.get(alert.stockCode) || {
          rsiOversold: false,
          goldenCross: false,
          volumeSpike: false,
        };

        // 새로 발생한 시그널만 true로 설정 (기존 true 유지)
        next.set(alert.stockCode, {
          rsiOversold: existing.rsiOversold || alert.triggers.rsiOversold,
          goldenCross: existing.goldenCross || alert.triggers.goldenCross,
          volumeSpike: existing.volumeSpike || alert.triggers.volumeSpike,
        });

        return next;
      });

      // 최근 알림 목록 앞에 추가 (실시간 알림은 isRead: false)
      const newAlert: SignalAlert = { ...alert, isRead: false };
      setRecentAlerts((prev) => {
        const next = [newAlert, ...prev];
        return next.slice(0, MAX_RECENT_ALERTS);
      });

      // 읽지 않은 개수 증가
      setUnreadCount((prev) => prev + 1);

      // 콜백 호출 (토스트 등)
      if (onNewAlert) {
        const corpName = stockNameMap?.get(alert.stockCode);
        onNewAlert(alert, corpName);
      }
    };

    // 스크리닝 완료 시 알림 목록 refetch (선별 종목 변경 반영)
    const handleScreeningCompleted = async () => {
      console.log("[SignalAlert] 스크리닝 완료 - 알림 목록 refetch");
      // signal-state-init 이벤트에서 새 상태로 덮어쓰므로 여기서 초기화 불필요
      await loadAlerts();
    };

    // 이벤트 리스너 등록
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("signal-state-init", handleSignalStateInit);
    socket.on("signal-alert", handleSignalAlert);
    socket.on("screening-completed", handleScreeningCompleted);

    // 이벤트 리스너 등록 후, 서버에 초기 상태 요청
    // (Race Condition 방지: 클라이언트 준비 완료 신호)
    console.log("[SignalAlert] 이벤트 리스너 등록 완료 - 서버에 준비 신호 전송");
    socket.emit("client-ready");

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("signal-state-init", handleSignalStateInit);
      socket.off("signal-alert", handleSignalAlert);
      socket.off("screening-completed", handleScreeningCompleted);
    };
  }, [socket, onNewAlert, stockNameMap, loadAlerts]);

  // 시그널 카운트 계산
  const rsiCount = Array.from(signals.values()).filter((s) => s.rsiOversold).length;
  const goldenCrossCount = Array.from(signals.values()).filter((s) => s.goldenCross).length;
  const volumeSpikeCount = Array.from(signals.values()).filter((s) => s.volumeSpike).length;

  // 알림 목록 초기화
  const clearAlerts = useCallback(() => {
    setRecentAlerts([]);
    setUnreadCount(0);
  }, []);

  // 개별 알림 읽음 처리
  const markAsRead = useCallback(async (alertId: string) => {
    try {
      const response = await jsonHttpClient.patch<MarkAsReadResponse>(`/api/signal-alerts/${alertId}`);

      if (response.success) {
        setRecentAlerts((prev) => prev.map((alert) => (alert.id === alertId ? { ...alert, isRead: true } : alert)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("[SignalAlert] 읽음 처리 실패:", error);
    }
  }, []);

  // 전체 알림 읽음 처리
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await jsonHttpClient.post<MarkAsReadResponse, object>("/api/signal-alerts", {});

      if (response.success) {
        setRecentAlerts((prev) => prev.map((alert) => ({ ...alert, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("[SignalAlert] 전체 읽음 처리 실패:", error);
    }
  }, []);

  return {
    signals,
    recentAlerts,
    unreadCount,
    rsiCount,
    goldenCrossCount,
    volumeSpikeCount,
    isConnected,
    isLoading,
    clearAlerts,
    markAsRead,
    markAllAsRead,
  };
}
