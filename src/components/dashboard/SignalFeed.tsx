"use client";

import { useMemo } from "react";
import type { ScreenedStock } from "@/hooks/useScreenedStocks";
import type { SignalAlert } from "@/hooks/useSignalAlert";

// ============================================================================
// Types
// ============================================================================

interface SignalFeedProps {
  alerts: SignalAlert[];
  stocks: ScreenedStock[];
}

// ============================================================================
// Constants
// ============================================================================

const SIGNAL_CONFIG = {
  rsiOversold: { label: "RSI 과매도", color: "bg-light-danger-50", icon: "📉" },
  goldenCross: { label: "골든크로스", color: "bg-light-success-50", icon: "📈" },
  volumeSpike: { label: "거래량 급등", color: "bg-light-warning-50", icon: "📊" },
};

// ============================================================================
// Component
// ============================================================================

export function SignalFeed({ alerts, stocks }: SignalFeedProps) {
  // 종목코드 → 종목명 맵
  const stockNameMap = useMemo(() => {
    const map = new Map<string, string>();
    stocks.forEach((s) => map.set(s.stockCode, s.corpName));
    return map;
  }, [stocks]);

  // 최근 10개만 표시
  const recentAlerts = alerts.slice(0, 10);

  if (recentAlerts.length === 0) {
    return (
      <div className="flex items-center gap-2 text-light-gray-40 text-sm">
        <span className="text-xs font-medium text-light-gray-50">실시간 알림</span>
        <span className="text-light-gray-30">|</span>
        <span>시그널 대기 중...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-light-gray-50 flex-shrink-0">실시간 알림</span>
      <div className="flex-1 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2">
          {recentAlerts.map((alert, index) => (
            <AlertItem key={`${alert.stockCode}-${alert.timestamp}-${index}`} alert={alert} stockName={stockNameMap.get(alert.stockCode) || alert.stockCode} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub Components
// ============================================================================

interface AlertItemProps {
  alert: SignalAlert;
  stockName: string;
}

function AlertItem({ alert, stockName }: AlertItemProps) {
  // 발생한 시그널 찾기
  const triggeredSignals = useMemo(() => {
    const signals: { key: keyof typeof SIGNAL_CONFIG; config: (typeof SIGNAL_CONFIG)[keyof typeof SIGNAL_CONFIG] }[] = [];

    if (alert.triggers.rsiOversold) signals.push({ key: "rsiOversold", config: SIGNAL_CONFIG.rsiOversold });
    if (alert.triggers.goldenCross) signals.push({ key: "goldenCross", config: SIGNAL_CONFIG.goldenCross });
    if (alert.triggers.volumeSpike) signals.push({ key: "volumeSpike", config: SIGNAL_CONFIG.volumeSpike });

    return signals;
  }, [alert.triggers]);

  // 시간 포맷
  const timeStr = useMemo(() => {
    const date = new Date(alert.timestamp);
    return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  }, [alert.timestamp]);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-light-gray-5 border border-light-gray-20 flex-shrink-0">
      {/* 시간 */}
      <span className="text-xs text-light-gray-40 font-mono">{timeStr}</span>

      {/* 종목명 */}
      <span className="text-xs font-medium text-light-gray-90">{stockName}</span>

      {/* 시그널 뱃지들 */}
      {triggeredSignals.map(({ key, config }) => (
        <span key={key} className={`px-1.5 py-0.5 rounded text-xs font-medium text-light-gray-0 ${config.color}`}>
          {config.icon}
        </span>
      ))}
    </div>
  );
}
