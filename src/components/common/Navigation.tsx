"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "홈", icon: "🏠", mobileOnly: false },
    { href: "/market", label: "시장 전체보기", icon: "📊", mobileOnly: false },
    { href: "/news", label: "뉴스", icon: "📰", mobileOnly: true },
    { href: "/screener", label: "종목 스크리너", icon: "🔍", mobileOnly: false },
    { href: "/tracker", label: "실시간 트래커", icon: "⚡", mobileOnly: false },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* 로고 */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-blue-600">💼</span>
              <span className="text-xl font-bold text-gray-900">investMate</span>
            </Link>
          </div>

          {/* 네비게이션 메뉴 */}
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-blue-600 hover:bg-gray-100"
                  } ${item.mobileOnly ? "mobile-only" : ""}`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
