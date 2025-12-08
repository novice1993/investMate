"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";

// ============================================================================
// Types
// ============================================================================

export interface SignalTriggers {
  rsiOversold: boolean;
  goldenCross: boolean;
  volumeSpike: boolean;
}

export interface SignalAlert {
  stockCode: string;
  triggers: SignalTriggers;
  rsi: { latest: number | null } | null;
  crossover: { type: string; shortMA: number | null; longMA: number | null } | null;
  volumeSpike: { ratio: number; isSpike: boolean } | null;
  timestamp: string;
}

export interface SignalState {
  /** 종목별 현재 시그널 상태 */
  signals: Map<string, SignalTriggers>;
  /** 최근 알림 목록 (최대 50개) */
  recentAlerts: SignalAlert[];
  /** RSI 과매도 종목 수 */
  rsiCount: number;
  /** 골든크로스 종목 수 */
  goldenCrossCount: number;
  /** 거래량 급등 종목 수 */
  volumeSpikeCount: number;
}

interface UseSignalAlertReturn extends SignalState {
  isConnected: boolean;
  clearAlerts: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_RECENT_ALERTS = 50;

// ============================================================================
// Hook
// ============================================================================

/**
 * Socket.io를 통한 실시간 시그널 알림 수신 훅
 */
export function useSignalAlert(): UseSignalAlertReturn {
  const [signals, setSignals] = useState<Map<string, SignalTriggers>>(new Map());
  const [recentAlerts, setRecentAlerts] = useState<SignalAlert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io({
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    // 초기 시그널 상태 수신 (접속 시 서버에서 일괄 전송)
    socket.on("signal-state-init", (initialState: Record<string, SignalTriggers>) => {
      console.log("[SignalAlert] 초기 상태 수신:", Object.keys(initialState).length, "개 종목");

      const stateMap = new Map<string, SignalTriggers>();
      for (const [stockCode, triggers] of Object.entries(initialState)) {
        stateMap.set(stockCode, triggers);
      }
      setSignals(stateMap);
    });

    // 실시간 시그널 알림 수신
    socket.on("signal-alert", (alert: SignalAlert) => {
      console.log("[SignalAlert] 수신:", alert);

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

      // 최근 알림 목록에 추가
      setRecentAlerts((prev) => {
        const next = [alert, ...prev];
        return next.slice(0, MAX_RECENT_ALERTS);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 시그널 카운트 계산
  const rsiCount = Array.from(signals.values()).filter((s) => s.rsiOversold).length;
  const goldenCrossCount = Array.from(signals.values()).filter((s) => s.goldenCross).length;
  const volumeSpikeCount = Array.from(signals.values()).filter((s) => s.volumeSpike).length;

  // 알림 목록 초기화
  const clearAlerts = useCallback(() => {
    setRecentAlerts([]);
  }, []);

  return {
    signals,
    recentAlerts,
    rsiCount,
    goldenCrossCount,
    volumeSpikeCount,
    isConnected,
    clearAlerts,
  };
}
