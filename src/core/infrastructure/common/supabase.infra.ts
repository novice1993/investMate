import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * @fileoverview Supabase 클라이언트를 위한 인메모리 캐시 인프라입니다.
 * `globalThis`를 사용하여, Next.js 개발 환경의 Hot Reloading 등에서도 상태가 유지되는
 * 안정적인 싱글톤(Singleton) 캐시를 구현합니다.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 1. globalThis에 캐시 객체의 타입을 선언해줍니다.
declare global {
  var supabaseClientCache: SupabaseClient | null;
}

// 2. 캐시 초기화 (서버가 시작되거나, 코드가 처음 로드될 때 딱 한 번만 실행)
globalThis.supabaseClientCache = globalThis.supabaseClientCache || null;

/**
 * Supabase 클라이언트를 초기화하고 전역 캐시에 저장합니다.
 */
export function initializeSupabaseClient(): void {
  if (globalThis.supabaseClientCache) {
    console.log("[Supabase Infra] Supabase client already initialized.");
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be provided in environment variables.");
  }

  try {
    globalThis.supabaseClientCache = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("[Supabase Infra] Supabase client initialized successfully.");
  } catch (error) {
    console.error("[Supabase Infra] Failed to initialize Supabase client:", error);
    throw error;
  }
}

/**
 * 현재 저장된 Supabase 클라이언트를 조회합니다.
 * @returns Supabase 클라이언트 인스턴스
 */
export function getSupabaseClient(): SupabaseClient {
  if (!globalThis.supabaseClientCache) {
    throw new Error("Supabase client not initialized. Call initializeSupabaseClient first.");
  }
  return globalThis.supabaseClientCache;
}
