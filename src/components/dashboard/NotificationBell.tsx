"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { ScreenedStock } from "@/hooks/useScreenedStocks";
import type { SignalAlert } from "@/hooks/useSignalAlert";

// ============================================================================
// Types
// ============================================================================

interface NotificationBellProps {
  alerts: SignalAlert[];
  stocks: ScreenedStock[];
  unreadCount: number;
  onMarkAllAsRead: () => Promise<void>;
  onMarkAsRead: (alertId: string) => Promise<void>;
  onAlertClick?: (stockCode: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

const SIGNAL_CONFIG = {
  rsiOversold: { label: "RSI 과매도", color: "bg-light-danger-50", textColor: "text-light-danger-50" },
  goldenCross: { label: "골든크로스", color: "bg-light-success-50", textColor: "text-light-success-50" },
  volumeSpike: { label: "거래량 급등", color: "bg-light-warning-50", textColor: "text-light-warning-60" },
};

// ============================================================================
// Component
// ============================================================================

export function NotificationBell({ alerts, stocks, unreadCount, onMarkAllAsRead, onMarkAsRead, onAlertClick }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 종목코드 → 종목명 맵
  const stockNameMap = useMemo(() => {
    const map = new Map<string, string>();
    stocks.forEach((s) => map.set(s.stockCode, s.corpName));
    return map;
  }, [stocks]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // 뱃지에 표시할 개수 (최대 99)
  const displayCount = Math.min(unreadCount, 99);

  // 전체 읽음 처리 핸들러
  const handleMarkAllAsRead = async () => {
    await onMarkAllAsRead();
  };

  // 개별 알림 클릭 핸들러
  const handleAlertClick = async (alert: SignalAlert) => {
    // 읽음 처리 (아직 안 읽은 경우 + id가 있는 경우)
    if (!alert.isRead && alert.id) {
      await onMarkAsRead(alert.id);
    }

    // 종목 포커싱
    if (onAlertClick) {
      onAlertClick(alert.stockCode);
    }

    // 드롭다운 닫기
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 알림 버튼 */}
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 rounded-lg hover:bg-light-gray-5 transition-colors" aria-label={`알림 ${displayCount}개`}>
        <svg className="w-6 h-6 text-light-gray-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* 알림 뱃지 */}
        {displayCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 flex items-center justify-center text-[10px] font-bold text-light-gray-0 bg-light-danger-50 rounded-full">
            {displayCount}
          </span>
        )}
      </button>

      {/* 드롭다운 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-light-gray-0 rounded-xl border border-light-gray-20 shadow-lg z-50 overflow-hidden">
          {/* 헤더 */}
          <div className="px-4 py-3 border-b border-light-gray-10 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-light-gray-90">시그널 알림</h3>
              <p className="text-xs text-light-gray-50 mt-0.5">{unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : `총 ${alerts.length}개`}</p>
            </div>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className="text-xs text-light-primary-50 hover:text-light-primary-60 font-medium">
                모두 읽음
              </button>
            )}
          </div>

          {/* 알림 목록 */}
          <div className="max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-light-gray-40">시그널 대기 중...</p>
              </div>
            ) : (
              <ul>
                {alerts.slice(0, 20).map((alert, index) => (
                  <AlertListItem
                    key={alert.id || `${alert.stockCode}-${alert.timestamp}-${index}`}
                    alert={alert}
                    stockName={stockNameMap.get(alert.stockCode) || alert.stockCode}
                    onClick={() => handleAlertClick(alert)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub Components
// ============================================================================

interface AlertListItemProps {
  alert: SignalAlert;
  stockName: string;
  onClick: () => void;
}

function AlertListItem({ alert, stockName, onClick }: AlertListItemProps) {
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

  // 읽음 여부에 따른 스타일
  const isRead = alert.isRead ?? false;

  return (
    <li className={`px-4 py-3 hover:bg-light-gray-5 transition-colors border-b border-light-gray-10 last:border-b-0 cursor-pointer ${isRead ? "opacity-60" : ""}`} onClick={onClick}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-light-primary-50 shrink-0" />}
            <p className={`text-sm font-medium text-light-gray-90 truncate ${isRead ? "" : "font-semibold"}`}>{stockName}</p>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {triggeredSignals.map(({ key, config }) => (
              <span key={key} className={`text-xs font-medium ${config.textColor}`}>
                {config.label}
              </span>
            ))}
          </div>
        </div>
        <span className="text-xs text-light-gray-40 font-mono shrink-0">{timeStr}</span>
      </div>
    </li>
  );
}
