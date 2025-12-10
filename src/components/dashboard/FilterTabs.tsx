"use client";

import type { FilterType } from "@/app/page";

// ============================================================================
// Types
// ============================================================================

interface FilterTabsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  totalCount: number;
  rsiCount: number;
  goldenCrossCount: number;
  volumeSpikeCount: number;
}

interface FilterConfig {
  key: FilterType;
  label: string;
  badgeColor: "primary" | "danger" | "success" | "warning";
}

// ============================================================================
// Constants
// ============================================================================

const FILTERS: FilterConfig[] = [
  { key: "all", label: "전체", badgeColor: "primary" },
  { key: "rsi", label: "RSI 과매도", badgeColor: "danger" },
  { key: "golden", label: "골든크로스", badgeColor: "success" },
  { key: "volume", label: "거래량 급등", badgeColor: "warning" },
];

const BADGE_COLORS = {
  primary: "bg-light-primary-50 text-light-gray-0",
  danger: "bg-light-danger-50 text-light-gray-0",
  success: "bg-light-success-50 text-light-gray-0",
  warning: "bg-light-warning-50 text-light-gray-90",
};

// ============================================================================
// Component
// ============================================================================

export function FilterTabs({ activeFilter, onFilterChange, totalCount, rsiCount, goldenCrossCount, volumeSpikeCount }: FilterTabsProps) {
  const counts: Record<FilterType, number> = {
    all: totalCount,
    rsi: rsiCount,
    golden: goldenCrossCount,
    volume: volumeSpikeCount,
  };

  return (
    <div className="flex gap-1.5 flex-wrap">
      {FILTERS.map(({ key, label, badgeColor }) => {
        const isActive = activeFilter === key;
        const count = counts[key];

        return (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              flex items-center gap-1.5
              ${isActive ? "bg-light-primary-50 text-light-gray-0" : "bg-light-gray-5 text-light-gray-60 hover:bg-light-gray-10"}
            `}
          >
            {label}
            {count > 0 && (
              <span
                className={`
                  px-1.5 py-0.5 rounded text-xs font-bold
                  ${isActive ? "bg-light-gray-0/20 text-light-gray-0" : BADGE_COLORS[badgeColor]}
                `}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
