/**
 * 개발용 모의 시그널 발생기
 *
 * 장 마감 후에도 토스트 알림 등을 테스트할 수 있도록
 * 주기적으로 가짜 시그널을 발생시킵니다.
 *
 * @example
 * // server.js에서 사용
 * import { startMockSignalEmitter } from "./src/core/dev/mock-signal.ts";
 *
 * // io는 Socket.io Server 인스턴스
 * startMockSignalEmitter(io, {
 *   interval: 5000,        // 5초마다 발생
 *   stockCodes: ["005930", "000660"], // 특정 종목만 (선택)
 * });
 */

import type { Server } from "socket.io";
import { getScreenedStockCodes } from "../infrastructure/market/screened-stocks-repository.infra";

// ============================================================================
// Types
// ============================================================================

interface MockSignalConfig {
  /** 시그널 발생 주기 (ms) - 기본값: 10000 (10초) */
  interval?: number;
  /** 활성화 여부 - 기본값: true */
  enabled?: boolean;
}

interface SignalAlert {
  stockCode: string;
  triggers: {
    rsiOversold: boolean;
    goldenCross: boolean;
    volumeSpike: boolean;
  };
  rsi: { latest: number } | null;
  crossover: { type: string; shortMA: number; longMA: number } | null;
  volumeSpike: { ratio: number; isSpike: boolean } | null;
  timestamp: string;
}

// ============================================================================
// Constants
// ============================================================================

const SIGNAL_TYPES = ["rsiOversold", "goldenCross", "volumeSpike"] as const;

// 선별 종목 캐시
let cachedStockCodes: string[] = [];

// ============================================================================
// Mock Signal Generator
// ============================================================================

let intervalId: NodeJS.Timeout | null = null;

/**
 * 랜덤 모의 시그널 생성
 */
function generateMockSignal(stockCode: string): SignalAlert {
  // 랜덤 시그널 타입 선택 (1~3개)
  const signalCount = Math.floor(Math.random() * 3) + 1;
  const shuffled = [...SIGNAL_TYPES].sort(() => Math.random() - 0.5);
  const selectedSignals = shuffled.slice(0, signalCount);

  const triggers = {
    rsiOversold: selectedSignals.includes("rsiOversold"),
    goldenCross: selectedSignals.includes("goldenCross"),
    volumeSpike: selectedSignals.includes("volumeSpike"),
  };

  return {
    stockCode,
    triggers,
    rsi: triggers.rsiOversold ? { latest: Math.random() * 30 } : null,
    crossover: triggers.goldenCross ? { type: "golden", shortMA: 50000, longMA: 49000 } : null,
    volumeSpike: triggers.volumeSpike ? { ratio: 2 + Math.random() * 3, isSpike: true } : null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 모의 시그널 발생기 시작
 * - 실제 선별 종목(Supabase)에서만 시그널 발생
 */
export async function startMockSignalEmitter(io: Server, config: MockSignalConfig = {}): Promise<void> {
  const { interval = 10000, enabled = true } = config;

  if (!enabled) {
    console.log("[MockSignal] 비활성화됨");
    return;
  }

  // 기존 인터벌이 있으면 정리
  if (intervalId) {
    clearInterval(intervalId);
  }

  // 선별 종목 로드 (Supabase에서)
  try {
    cachedStockCodes = await getScreenedStockCodes();
    if (cachedStockCodes.length === 0) {
      console.log("[MockSignal] ⚠️ 선별 종목이 없습니다. 비활성화됨");
      return;
    }
  } catch (error) {
    console.error("[MockSignal] ❌ 선별 종목 로드 실패:", error);
    return;
  }

  console.log(`[MockSignal] ✅ 시작 - ${interval / 1000}초 간격`);
  console.log(`[MockSignal] 대상: 선별 종목 ${cachedStockCodes.length}개`);

  intervalId = setInterval(() => {
    // 랜덤 종목 선택 (선별 종목에서)
    const randomIndex = Math.floor(Math.random() * cachedStockCodes.length);
    const stockCode = cachedStockCodes[randomIndex];

    // 모의 시그널 생성 및 발송
    const mockSignal = generateMockSignal(stockCode);

    console.log(`[MockSignal] 발생: ${stockCode}`, mockSignal.triggers);
    io.emit("signal-alert", mockSignal);
  }, interval);
}

/**
 * 모의 시그널 발생기 중지
 */
export function stopMockSignalEmitter(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[MockSignal] ⏹️ 중지됨");
  }
}

/**
 * 즉시 모의 시그널 1회 발생 (테스트용)
 */
export function emitMockSignalOnce(io: Server, stockCode?: string): SignalAlert | null {
  // 종목코드 지정이 없으면 캐시된 선별 종목에서 첫 번째 사용
  const code = stockCode || cachedStockCodes[0];
  if (!code) {
    console.log("[MockSignal] ⚠️ 선별 종목이 없습니다.");
    return null;
  }

  const mockSignal = generateMockSignal(code);

  console.log(`[MockSignal] 즉시 발생: ${code}`, mockSignal.triggers);
  io.emit("signal-alert", mockSignal);

  return mockSignal;
}
