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
      <section className="bg-light-gray-0 rounded-xl border border-light-gray-20 p-4">
        <h2 className="text-sm font-semibold text-light-gray-70 mb-3">실시간 알림</h2>
        <div className="flex items-center justify-center h-24 text-light-gray-40 text-sm">시그널 대기 중...</div>
      </section>
    );
  }

  return (
    <section className="bg-light-gray-0 rounded-xl border border-light-gray-20 p-4">
      <h2 className="text-sm font-semibold text-light-gray-70 mb-3">실시간 알림</h2>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {recentAlerts.map((alert, index) => (
          <AlertItem key={`${alert.stockCode}-${alert.timestamp}-${index}`} alert={alert} stockName={stockNameMap.get(alert.stockCode) || alert.stockCode} />
        ))}
      </div>
    </section>
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
    return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }, [alert.timestamp]);

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-light-gray-5 transition-colors">
      {/* 시간 */}
      <span className="text-xs text-light-gray-40 font-mono w-16 flex-shrink-0">{timeStr}</span>

      {/* 종목명 */}
      <span className="text-sm font-medium text-light-gray-90 flex-shrink-0">{stockName}</span>

      {/* 시그널 뱃지들 */}
      <div className="flex gap-1 flex-wrap">
        {triggeredSignals.map(({ key, config }) => (
          <span key={key} className={`px-2 py-0.5 rounded text-xs font-medium text-light-gray-0 ${config.color}`}>
            {config.icon} {config.label}
          </span>
        ))}
      </div>
    </div>
  );
}
