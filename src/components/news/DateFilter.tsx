"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useState } from "react";
import { DayPicker, DateRange as DayPickerDateRange } from "react-day-picker";
import { DateRange, QuickFilterType } from "./types";
import "react-day-picker/dist/style.css";

interface DateFilterProps {
  value: QuickFilterType;
  customRange?: DateRange;
  onChange: (filterType: QuickFilterType, customRange?: DateRange) => void;
  className?: string;
}

const quickFilters: { value: QuickFilterType; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "today", label: "오늘" },
  { value: "yesterday", label: "어제" },
  { value: "3days", label: "최근 3일" },
  { value: "7days", label: "최근 7일" },
  { value: "30days", label: "최근 30일" },
];

export function DateFilter({ value, customRange, onChange, className = "" }: DateFilterProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [tempRange, setTempRange] = useState<DayPickerDateRange | undefined>(customRange ? { from: customRange.from, to: customRange.to } : undefined);

  const handleQuickFilterClick = (filterType: QuickFilterType) => {
    if (filterType === "custom") {
      setShowCustomPicker(!showCustomPicker);
    } else {
      setShowCustomPicker(false);
      onChange(filterType);
    }
  };

  const handleApplyCustomRange = () => {
    if (tempRange?.from && tempRange?.to) {
      onChange("custom", { from: tempRange.from, to: tempRange.to });
      setShowCustomPicker(false);
    }
  };

  const handleCancelCustomRange = () => {
    setShowCustomPicker(false);
    setTempRange(customRange ? { from: customRange.from, to: customRange.to } : undefined);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Quick Filter 버튼들 */}
      <div className="flex flex-wrap gap-2">
        {quickFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => handleQuickFilterClick(filter.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${value === filter.value && !showCustomPicker ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            {filter.label}
          </button>
        ))}

        {/* 기간 설정 버튼 */}
        <button
          onClick={() => handleQuickFilterClick("custom")}
          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${value === "custom" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          {value === "custom" && customRange ? `${format(customRange.from, "M/d", { locale: ko })} - ${format(customRange.to, "M/d", { locale: ko })}` : "기간 설정"}
        </button>
      </div>

      {/* Custom Date Picker (인라인 확장) */}
      {showCustomPicker && (
        <div className="border border-gray-300 rounded-lg p-4 bg-white shadow-lg">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">기간 선택</h4>
            <p className="text-xs text-gray-600">시작일과 종료일을 선택하세요</p>
          </div>

          <DayPicker
            mode="range"
            selected={tempRange}
            onSelect={setTempRange}
            locale={ko}
            className="border-0"
            classNames={{
              day_selected: "bg-blue-600 text-white hover:bg-blue-700",
              day_today: "font-bold text-blue-600",
            }}
          />

          {/* 적용/취소 버튼 */}
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <button onClick={handleCancelCustomRange} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors">
              취소
            </button>
            <button
              onClick={handleApplyCustomRange}
              disabled={!tempRange?.from || !tempRange?.to}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              적용
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
