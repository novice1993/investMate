/**
 * @fileoverview 애플리케이션 이벤트 버스
 *
 * Node.js EventEmitter를 활용하여 서로 다른 레이어 간 통신을 가능하게 합니다.
 * - cron job → server.js 통신
 * - 서버 → 클라이언트 이벤트 트리거
 */

import { EventEmitter } from "events";

// ============================================================================
// Event Types
// ============================================================================

export const APP_EVENTS = {
  /** 종목 스크리닝 완료 이벤트 */
  SCREENING_COMPLETED: "screening-completed",
} as const;

export type AppEventType = (typeof APP_EVENTS)[keyof typeof APP_EVENTS];

// ============================================================================
// Event Payloads
// ============================================================================

export interface ScreeningCompletedPayload {
  /** 선별된 종목 수 */
  screenedCount: number;
  /** 선별된 종목 코드 목록 */
  stockCodes: string[];
  /** 완료 시간 */
  completedAt: string;
}

// ============================================================================
// Event Bus Instance
// ============================================================================

/**
 * 애플리케이션 전역 이벤트 버스
 *
 * 사용 예시:
 * ```typescript
 * // 이벤트 발생
 * appEvents.emit(APP_EVENTS.SCREENING_COMPLETED, { screenedCount: 40, ... });
 *
 * // 이벤트 구독
 * appEvents.on(APP_EVENTS.SCREENING_COMPLETED, (payload) => { ... });
 * ```
 */
export const appEvents = new EventEmitter();

// 메모리 누수 방지를 위한 최대 리스너 수 설정
appEvents.setMaxListeners(20);
