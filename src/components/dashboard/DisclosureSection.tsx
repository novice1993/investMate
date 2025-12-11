"use client";

import { useEffect, useState } from "react";
import { useDisclosures, useDisclosureSummary, type DisclosureItem } from "@/hooks/useDisclosures";

// ============================================================================
// Types
// ============================================================================

interface DisclosureSectionProps {
  corpCode: string;
}

// ============================================================================
// Component
// ============================================================================

export function DisclosureSection({ corpCode }: DisclosureSectionProps) {
  const { data: disclosures, isLoading, error } = useDisclosures(corpCode);
  const [selectedReceiptNo, setSelectedReceiptNo] = useState<string | null>(null);

  // 종목 변경 시 선택된 공시 초기화
  useEffect(() => {
    setSelectedReceiptNo(null);
  }, [corpCode]);

  if (isLoading) {
    return <DisclosureSkeleton />;
  }

  if (error) {
    return (
      <div className="p-3 bg-light-danger-5 border border-light-danger-20 rounded-lg">
        <p className="text-sm text-light-danger-60">공시 목록을 불러올 수 없습니다</p>
      </div>
    );
  }

  if (!disclosures || disclosures.length === 0) {
    return (
      <div className="p-3 bg-light-gray-5 rounded-lg">
        <p className="text-sm text-light-gray-50">최근 공시가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 안내 문구 */}
      <p className="text-xs text-light-gray-40 flex items-center gap-1">
        <SparkleIcon />
        클릭하면 AI가 요약해드려요
      </p>

      {/* 공시 목록 */}
      <ul className="space-y-1 max-h-[200px] overflow-y-auto">
        {disclosures.slice(0, 5).map((item) => (
          <DisclosureListItem
            key={item.receiptNo}
            item={item}
            isSelected={selectedReceiptNo === item.receiptNo}
            onSelect={() => setSelectedReceiptNo(item.receiptNo === selectedReceiptNo ? null : item.receiptNo)}
          />
        ))}
      </ul>

      {/* 요약 패널 */}
      {selectedReceiptNo && <SummaryPanel receiptNo={selectedReceiptNo} onClose={() => setSelectedReceiptNo(null)} />}
    </div>
  );
}

// ============================================================================
// Sub Components
// ============================================================================

interface DisclosureListItemProps {
  item: DisclosureItem;
  isSelected: boolean;
  onSelect: () => void;
}

function DisclosureListItem({ item, isSelected, onSelect }: DisclosureListItemProps) {
  const formattedDate = formatDate(item.receiptDate);

  return (
    <li>
      <button
        onClick={onSelect}
        className={`w-full text-left p-2 rounded-lg transition-colors ${isSelected ? "bg-light-primary-5 border border-light-primary-30" : "bg-light-gray-5 hover:bg-light-gray-10"}`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-light-gray-90 line-clamp-1 flex-1">{item.reportName}</p>
          <span className="text-xs text-light-gray-40 shrink-0">{formattedDate}</span>
        </div>
      </button>
    </li>
  );
}

interface SummaryPanelProps {
  receiptNo: string;
  onClose: () => void;
}

function SummaryPanel({ receiptNo, onClose }: SummaryPanelProps) {
  const { data: summary, isLoading, error } = useDisclosureSummary(receiptNo);

  return (
    <div className="p-3 bg-light-primary-5 border border-light-primary-20 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-light-primary-60 flex items-center gap-1">
          <SparkleIcon />
          AI 요약
        </h4>
        <button onClick={onClose} className="text-light-gray-40 hover:text-light-gray-60">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-light-primary-50 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-light-gray-50">요약 생성 중...</span>
        </div>
      )}

      {error && <p className="text-sm text-light-danger-60">요약을 불러올 수 없습니다</p>}

      {summary && (
        <>
          <p className="text-sm text-light-gray-70 leading-relaxed">{summary.summary}</p>
          {summary.truncated && <p className="text-xs text-light-gray-40 mt-2">* 공시 내용이 길어 일부만 요약되었습니다</p>}
        </>
      )}
    </div>
  );
}

function DisclosureSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-10 bg-light-gray-10 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z" />
      <path d="M5 16L5.54 18.54L8 19L5.54 19.46L5 22L4.46 19.46L2 19L4.46 18.54L5 16Z" />
      <path d="M19 16L19.54 18.54L22 19L19.54 19.46L19 22L18.46 19.46L16 19L18.46 18.54L19 16Z" />
    </svg>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr: string): string {
  if (dateStr.length === 8) {
    return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
  }
  return dateStr;
}
