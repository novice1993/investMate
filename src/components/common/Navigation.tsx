"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// ============================================================================
// Types
// ============================================================================

interface NavigationProps {
  /** 우측에 표시할 추가 요소 (검색, 상태 표시 등) */
  rightSlot?: ReactNode;
}

// ============================================================================
// Constants
// ============================================================================

const NAV_ITEMS = [
  { href: "/", label: "대시보드" },
  { href: "/news", label: "뉴스" },
];

// ============================================================================
// Component
// ============================================================================

export function Navigation({ rightSlot }: NavigationProps) {
  const pathname = usePathname();

  return (
    <nav className="bg-light-gray-0 border-b border-light-gray-20 sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* 좌측: 로고 + 네비게이션 */}
          <div className="flex items-center gap-8">
            {/* 로고 */}
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-bold text-light-gray-90">investMate</span>
            </Link>

            {/* 네비게이션 메뉴 */}
            <div className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive ? "bg-light-primary-5 text-light-primary-60" : "text-light-gray-50 hover:text-light-gray-90 hover:bg-light-gray-5"}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* 우측: 슬롯 (검색, 연결 상태 등) */}
          {rightSlot && <div className="flex items-center gap-4">{rightSlot}</div>}
        </div>
      </div>
    </nav>
  );
}
