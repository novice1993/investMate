"use client";

import { useState, useRef, useEffect } from "react";
import type { FilterType } from "@/app/page";
import { ConnectionStatus } from "./ConnectionStatus";

// ============================================================================
// Types
// ============================================================================

interface MobileMenuProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  totalCount: number;
  rsiCount: number;
  goldenCrossCount: number;
  volumeSpikeCount: number;
  isConnected: boolean;
  isKisConnected: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const FILTERS: { key: FilterType; label: string; color: string }[] = [
  { key: "all", label: "전체", color: "bg-light-primary-50" },
  { key: "rsi", label: "RSI 과매도", color: "bg-light-danger-50" },
  { key: "golden", label: "골든크로스", color: "bg-light-success-50" },
  { key: "volume", label: "거래량 급등", color: "bg-light-warning-50" },
];

// ============================================================================
// Component
// ============================================================================

export function MobileMenu({ activeFilter, onFilterChange, totalCount, rsiCount, goldenCrossCount, volumeSpikeCount, isConnected, isKisConnected }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const counts: Record<FilterType, number> = {
    all: totalCount,
    rsi: rsiCount,
    golden: goldenCrossCount,
    volume: volumeSpikeCount,
  };

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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

  // 필터 선택 시 메뉴 닫기
  const handleFilterSelect = (filter: FilterType) => {
    onFilterChange(filter);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* 햄버거 버튼 */}
      <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-lg hover:bg-light-gray-5 transition-colors" aria-label="메뉴">
        <svg className="w-6 h-6 text-light-gray-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-light-gray-0 rounded-xl border border-light-gray-20 shadow-lg z-50 overflow-hidden">
          {/* 필터 */}
          <div className="p-3 border-b border-light-gray-10">
            <p className="text-xs font-medium text-light-gray-50 mb-2">필터</p>
            <div className="flex flex-col gap-1">
              {FILTERS.map(({ key, label, color }) => {
                const isActive = activeFilter === key;
                const count = counts[key];

                return (
                  <button
                    key={key}
                    onClick={() => handleFilterSelect(key)}
                    className={`
                      flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors
                      ${isActive ? "bg-light-primary-5 text-light-primary-50" : "hover:bg-light-gray-5 text-light-gray-70"}
                    `}
                  >
                    <span className="font-medium">{label}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold text-light-gray-0 ${color}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 연결 상태 */}
          <div className="p-3">
            <p className="text-xs font-medium text-light-gray-50 mb-2">연결 상태</p>
            <ConnectionStatus isConnected={isConnected} isKisConnected={isKisConnected} />
          </div>
        </div>
      )}
    </div>
  );
}
