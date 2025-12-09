"use client";

// ============================================================================
// Types
// ============================================================================

interface ConnectionStatusProps {
  isConnected: boolean;
  isKisConnected: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function ConnectionStatus({ isConnected, isKisConnected }: ConnectionStatusProps) {
  const status = getStatus(isConnected, isKisConnected);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-light-gray-0 rounded-full border border-light-gray-20">
      <span className={`w-2 h-2 rounded-full ${status.color} ${status.animate ? "animate-pulse" : ""}`} />
      <span className="text-sm text-light-gray-60">{status.text}</span>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getStatus(isConnected: boolean, isKisConnected: boolean) {
  if (!isConnected) {
    return { text: "연결 중...", color: "bg-light-warning-50", animate: true };
  }
  if (!isKisConnected) {
    return { text: "장 마감", color: "bg-light-gray-40", animate: false };
  }
  return { text: "실시간", color: "bg-light-success-50", animate: true };
}
