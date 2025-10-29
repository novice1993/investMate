/**
 * @fileoverview KIS 인증 토큰을 위한 인메모리 캐시 서비스입니다.
 * `globalThis`를 사용하여, Next.js 개발 환경의 Hot Reloading 등에서도 상태가 유지되는
 * 안정적인 싱글톤(Singleton) 캐시를 구현합니다.
 */

// 1. globalThis에 캐시 객체의 타입을 선언해줍니다.
declare global {
  var kisAuthTokenCache: string | null;
}

// 2. 캐시 초기화 (서버가 시작되거나, 코드가 처음 로드될 때 딱 한 번만 실행)
globalThis.kisAuthTokenCache = globalThis.kisAuthTokenCache || null;

/**
 * 현재 저장된 KIS 인증 토큰을 조회합니다.
 * @returns 인증 토큰 문자열 또는 null
 */
export function getAuthToken(): string | null {
  return globalThis.kisAuthTokenCache;
}

/**
 * KIS 인증 토큰을 인메모리 캐시에 저장하거나 업데이트합니다.
 * @param newToken 저장할 새로운 인증 토큰
 */
export function setAuthToken(newToken: string): void {
  console.log("KIS Auth token has been set/updated in global cache.");
  globalThis.kisAuthTokenCache = newToken;
}

/**
 * 인메모리 캐시에 저장된 KIS 인증 토큰을 삭제합니다.
 */
export function clearAuthToken(): void {
  console.log("KIS Auth token has been cleared from global cache.");
  globalThis.kisAuthTokenCache = null;
}
