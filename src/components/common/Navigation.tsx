import type { ReactNode } from "react";

// ============================================================================
// Types
// ============================================================================

interface NavigationProps {
  /** 우측에 표시할 추가 요소 (검색, 상태 표시 등) */
  rightSlot?: ReactNode;
}

// ============================================================================
// Component
// ============================================================================

export function Navigation({ rightSlot }: NavigationProps) {
  return (
    <nav className="bg-light-gray-0 border-b border-light-gray-20 sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-14">
          {/* 로고 */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-light-primary-50 flex items-center justify-center">
              <span className="text-light-gray-0 font-bold text-sm">iM</span>
            </div>
            <span className="text-lg font-bold text-light-gray-90">investMate</span>
          </div>

          {/* 우측: 슬롯 (검색, 연결 상태 등) */}
          {rightSlot && <div className="flex items-center gap-3">{rightSlot}</div>}
        </div>
      </div>
    </nav>
  );
}
