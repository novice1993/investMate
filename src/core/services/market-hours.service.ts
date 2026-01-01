import { isHoliday } from "@hyunbinseo/holidays-kr";

/**
 * @fileoverview KOSPI 개장 시간 판단 서비스
 *
 * 한국 주식시장 개장 여부를 판단합니다.
 * - 개장 시간: 평일 09:00 ~ 15:30 (한국 시간)
 * - 휴장일: 주말, 공휴일
 */

// ============================================================================
// Types
// ============================================================================

export interface MarketStatus {
  /** 현재 개장 여부 */
  isOpen: boolean;
  /** 상태 메시지 */
  message: string;
  /** 다음 개장까지 남은 시간 (분) - 폐장 시에만 */
  minutesUntilOpen?: number;
}

// ============================================================================
// Constants
// ============================================================================

/** 개장 시간 (09:00) */
const MARKET_OPEN_HOUR = 9;
const MARKET_OPEN_MINUTE = 0;

/** 폐장 시간 (15:30) */
const MARKET_CLOSE_HOUR = 15;
const MARKET_CLOSE_MINUTE = 30;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 현재 한국 시간을 반환합니다.
 */
function getKoreaTime(date: Date = new Date()): Date {
  return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
}

/**
 * 분 단위로 시간을 변환합니다.
 */
function toMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * 주말 여부를 확인합니다.
 */
export function isWeekend(date: Date = new Date()): boolean {
  const koreaTime = getKoreaTime(date);
  const day = koreaTime.getDay();
  return day === 0 || day === 6; // 일요일(0) 또는 토요일(6)
}

/**
 * 공휴일 여부를 확인합니다.
 */
export function isKoreanHoliday(date: Date = new Date()): boolean {
  const koreaTime = getKoreaTime(date);
  return isHoliday(koreaTime);
}

/**
 * 개장 시간 내인지 확인합니다.
 */
export function isWithinTradingHours(date: Date = new Date()): boolean {
  const koreaTime = getKoreaTime(date);
  const hours = koreaTime.getHours();
  const minutes = koreaTime.getMinutes();
  const currentMinutes = toMinutes(hours, minutes);

  const marketOpen = toMinutes(MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE);
  const marketClose = toMinutes(MARKET_CLOSE_HOUR, MARKET_CLOSE_MINUTE);

  return currentMinutes >= marketOpen && currentMinutes <= marketClose;
}

/**
 * 현재 주식시장이 개장 중인지 확인합니다.
 *
 * @returns 개장 여부 (true: 개장, false: 폐장)
 */
export function isMarketOpen(date: Date = new Date()): boolean {
  // 주말 체크
  if (isWeekend(date)) return false;

  // 공휴일 체크
  if (isKoreanHoliday(date)) return false;

  // 개장 시간 체크
  return isWithinTradingHours(date);
}

/**
 * 현재 시장 상태를 상세하게 반환합니다.
 */
export function getMarketStatus(date: Date = new Date()): MarketStatus {
  const koreaTime = getKoreaTime(date);

  if (isWeekend(date)) {
    return {
      isOpen: false,
      message: "주말 휴장",
    };
  }

  if (isKoreanHoliday(date)) {
    return {
      isOpen: false,
      message: "공휴일 휴장",
    };
  }

  const hours = koreaTime.getHours();
  const minutes = koreaTime.getMinutes();
  const currentMinutes = toMinutes(hours, minutes);

  const marketOpen = toMinutes(MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE);
  const marketClose = toMinutes(MARKET_CLOSE_HOUR, MARKET_CLOSE_MINUTE);

  if (currentMinutes < marketOpen) {
    return {
      isOpen: false,
      message: "개장 전",
      minutesUntilOpen: marketOpen - currentMinutes,
    };
  }

  if (currentMinutes > marketClose) {
    return {
      isOpen: false,
      message: "장 마감",
    };
  }

  return {
    isOpen: true,
    message: "거래 중",
  };
}
