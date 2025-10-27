/**
 * 뉴스 컴포넌트 관련 타입 정의
 */

export type QuickFilterType = "all" | "today" | "yesterday" | "3days" | "7days" | "30days" | "custom";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DateFilterState {
  type: QuickFilterType;
  customRange?: DateRange;
}
