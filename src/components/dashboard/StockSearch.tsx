"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useKospiStocks, type KospiStock } from "@/hooks/useKospiStocks";

// ============================================================================
// Types
// ============================================================================

interface StockSearchProps {
  onSelect: (stock: KospiStock) => void;
  screenedStockCodes?: Set<string>;
}

// ============================================================================
// Constants
// ============================================================================

const DEBOUNCE_MS = 200;

// ============================================================================
// Component
// ============================================================================

export function StockSearch({ onSelect, screenedStockCodes = new Set() }: StockSearchProps) {
  const { search, isLoading: isLoadingStocks } = useKospiStocks();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KospiStock[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // 디바운스 검색
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const searchResults = search(query);
      setResults(searchResults);
      setIsOpen(searchResults.length > 0);
      setActiveIndex(-1);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, search]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) && inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // activeIndex 변경 시 스크롤
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeItem = listRef.current.children[activeIndex] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  // 종목 선택
  const handleSelect = useCallback(
    (stock: KospiStock) => {
      onSelect(stock);
      setQuery("");
      setIsOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    },
    [onSelect]
  );

  // 키보드 네비게이션
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < results.length) {
            handleSelect(results[activeIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setActiveIndex(-1);
          break;
      }
    },
    [isOpen, results, activeIndex, handleSelect]
  );

  return (
    <div className="relative">
      {/* 검색 입력 */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-gray-40" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && results.length > 0 && setIsOpen(true)}
          placeholder={isLoadingStocks ? "로딩 중..." : "종목명 또는 코드 검색"}
          disabled={isLoadingStocks}
          className="w-full pl-9 pr-4 py-2 text-sm bg-light-gray-0 border border-light-gray-20 rounded-lg
            placeholder:text-light-gray-40 text-light-gray-90
            focus:outline-none focus:border-light-primary-50 focus:ring-1 focus:ring-light-primary-50
            disabled:bg-light-gray-5 disabled:cursor-not-allowed
            transition-colors"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-light-gray-40 hover:text-light-gray-60 transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 검색 결과 드롭다운 */}
      {isOpen && (
        <div ref={dropdownRef} className="absolute z-50 min-w-[240px] w-full sm:w-72 mt-1 bg-light-gray-0 border border-light-gray-20 rounded-lg shadow-lg overflow-hidden">
          <ul ref={listRef} className="max-h-64 overflow-y-auto">
            {results.map((stock, index) => {
              const isScreened = screenedStockCodes.has(stock.stockCode);
              const isActive = index === activeIndex;

              return (
                <li key={stock.stockCode}>
                  <button
                    onClick={() => handleSelect(stock)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`w-full px-3 py-2.5 text-left transition-colors ${isActive ? "bg-light-primary-5" : "hover:bg-light-gray-5"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-sm text-light-gray-90 truncate">{stock.corpName}</span>
                          {isScreened && <span className="px-1 py-0.5 text-[10px] font-medium bg-light-primary-50 text-light-gray-0 rounded shrink-0">실시간</span>}
                        </div>
                        <span className="text-xs text-light-gray-50">{stock.stockCode}</span>
                      </div>
                      <span className="text-xs text-light-gray-40 shrink-0">{formatMarketCap(stock.marketCap)}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub Components
// ============================================================================

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatMarketCap(value: number): string {
  if (value >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(1)}조`;
  }
  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(0)}억`;
  }
  return `${(value / 10_000).toFixed(0)}만`;
}
