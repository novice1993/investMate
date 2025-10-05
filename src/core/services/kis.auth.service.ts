/**
 * @fileoverview KIS 인증 토큰을 위한 인메모리 캐시 서비스입니다.
 * 이 모듈은 클로저를 사용하여 서버 전역에서 사용되는 토큰 인스턴스를 관리합니다.
 */

// 클로저 스코프에 토큰을 저장하는 변수. 모듈 외부에서 직접 접근할 수 없습니다.
let authToken: string | null = null;

/**
 * 현재 저장된 KIS 인증 토큰을 조회합니다.
 * @returns 인증 토큰 문자열 또는 null
 */
export function getAuthToken(): string | null {
  return authToken;
}

/**
 * KIS 인증 토큰을 인메모리 캐시에 저장하거나 업데이트합니다.
 * @param newToken 저장할 새로운 인증 토큰
 */
export function setAuthToken(newToken: string): void {
  console.log("KIS Auth token has been set/updated.");
  authToken = newToken;
}

/**
 * 인메모리 캐시에 저장된 KIS 인증 토큰을 삭제합니다.
 */
export function clearAuthToken(): void {
  console.log("KIS Auth token has been cleared.");
  authToken = null;
}
