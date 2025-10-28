/**
 * @fileoverview Cron job 중복 실행 방지를 위한 Mutex 유틸리티
 */

declare global {
  var cronMutexes: Map<string, boolean> | undefined;
}

// globalThis에 mutex 맵 초기화
if (!globalThis.cronMutexes) {
  globalThis.cronMutexes = new Map<string, boolean>();
}

/**
 * Mutex 획득 (잠금 설정)
 * @param key Mutex 식별자 (job 이름)
 */
export function acquireMutex(key: string): void {
  const mutexes = globalThis.cronMutexes!;
  mutexes.set(key, true);
}

/**
 * Mutex 해제
 * @param key Mutex 식별자 (job 이름)
 */
export function releaseMutex(key: string): void {
  const mutexes = globalThis.cronMutexes!;
  mutexes.set(key, false);
}

/**
 * Mutex 상태 확인 (디버깅용)
 * @param key Mutex 식별자 (job 이름)
 * @returns 잠금 여부
 */
export function isMutexLocked(key: string): boolean {
  const mutexes = globalThis.cronMutexes!;
  return mutexes.get(key) === true;
}
