/**
 * 뉴스 날짜 필터링 유틸 함수
 */

import { startOfDay, endOfDay, subDays, isWithinInterval, isToday, isYesterday } from "date-fns";
import { NewsArticle } from "@/core/entities/news.entity";
import { QuickFilterType, DateRange } from "./types";

/**
 * Quick Filter에 따른 날짜 범위 계산
 */
export function getDateRangeFromQuickFilter(filterType: QuickFilterType): DateRange | null {
  const now = new Date();

  switch (filterType) {
    case "all":
      return null; // 전체 표시

    case "today":
      return {
        from: startOfDay(now),
        to: endOfDay(now),
      };

    case "yesterday": {
      const yesterday = subDays(now, 1);
      return {
        from: startOfDay(yesterday),
        to: endOfDay(yesterday),
      };
    }

    case "3days":
      return {
        from: startOfDay(subDays(now, 2)), // 오늘 포함 3일
        to: endOfDay(now),
      };

    case "7days":
      return {
        from: startOfDay(subDays(now, 6)), // 오늘 포함 7일
        to: endOfDay(now),
      };

    case "30days":
      return {
        from: startOfDay(subDays(now, 29)), // 오늘 포함 30일
        to: endOfDay(now),
      };

    default:
      return null;
  }
}

/**
 * 뉴스 배열을 날짜 범위로 필터링
 */
export function filterNewsByDateRange(news: NewsArticle[], dateRange: DateRange | null): NewsArticle[] {
  if (!dateRange) {
    return news; // 필터 없음
  }

  return news.filter((item) => {
    const publishedDate = new Date(item.published_at);
    return isWithinInterval(publishedDate, {
      start: dateRange.from,
      end: dateRange.to,
    });
  });
}

/**
 * Quick Filter와 Custom Range를 통합하여 뉴스 필터링
 */
export function applyDateFilter(news: NewsArticle[], filterType: QuickFilterType, customRange?: DateRange): NewsArticle[] {
  if (filterType === "custom" && customRange) {
    return filterNewsByDateRange(news, customRange);
  }

  const dateRange = getDateRangeFromQuickFilter(filterType);
  return filterNewsByDateRange(news, dateRange);
}

/**
 * 날짜가 오늘인지 확인
 */
export function isNewsToday(publishedAt: string): boolean {
  return isToday(new Date(publishedAt));
}

/**
 * 날짜가 어제인지 확인
 */
export function isNewsYesterday(publishedAt: string): boolean {
  return isYesterday(new Date(publishedAt));
}
