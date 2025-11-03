/**
 * 메모리 기반 캐시 유틸리티
 * globalThis를 사용하여 Next.js Hot Reload 환경에서도 캐시 유지
 */

declare global {
  var appCache: Map<string, unknown>;
}

globalThis.appCache = globalThis.appCache || new Map<string, unknown>();

export function getCached<T>(key: string): T | null {
  const value = globalThis.appCache.get(key);
  return value !== undefined ? (value as T) : null;
}

export function setCache<T>(key: string, value: T): void {
  globalThis.appCache.set(key, value);
}

export function clearCache(key: string): void {
  globalThis.appCache.delete(key);
}

export function clearAllCache(): void {
  globalThis.appCache.clear();
}
