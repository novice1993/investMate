"use client";

import type { SignalTriggers } from "@/hooks/useSignalAlert";

// ============================================================================
// Types
// ============================================================================

interface SignalBadgesProps {
  signal: SignalTriggers;
}

interface BadgeConfig {
  key: keyof SignalTriggers;
  label: string;
  color: string;
}

// ============================================================================
// Constants
// ============================================================================

const BADGE_CONFIGS: BadgeConfig[] = [
  { key: "rsiOversold", label: "RSI 과매도", color: "bg-light-primary-50" },
  { key: "goldenCross", label: "골든크로스", color: "bg-light-warning-50" },
  { key: "volumeSpike", label: "거래량 급등", color: "bg-light-success-50" },
];

// ============================================================================
// Component
// ============================================================================

export function SignalBadges({ signal }: SignalBadgesProps) {
  const activeBadges = BADGE_CONFIGS.filter((config) => signal[config.key]);

  if (activeBadges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {activeBadges.map((badge) => (
        <span
          key={badge.key}
          className={`
            px-2 py-0.5 rounded-full text-xs font-medium text-white
            ${badge.color}
          `}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}
