/**
 * @fileoverview Mock KIS WebSocket 서버 실행 스크립트
 *
 * 사용법: npm run mock:kis
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { MockKisWebSocketServer } from "../src/core/dev/mock-kis-websocket-server";

// .env.local 파일에서 환경변수 로드 (Supabase 접속 정보)
function loadEnvFile(filename: string): void {
  const filepath = resolve(process.cwd(), filename);
  if (!existsSync(filepath)) {
    console.log(`[Mock KIS] ${filename} 파일 없음 - 건너뜀`);
    return;
  }

  const content = readFileSync(filepath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();

    // 이미 설정된 환경변수는 덮어쓰지 않음
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
  console.log(`[Mock KIS] ${filename} 환경변수 로드 완료`);
}

// 환경변수 파일 로드 (.env.local 우선, .env 기본)
loadEnvFile(".env.local");
loadEnvFile(".env");
loadEnvFile(".env.development");

const PORT = parseInt(process.env.MOCK_KIS_WS_PORT || "21001", 10);

const server = new MockKisWebSocketServer(PORT);

// 서버 시작
server.start();

// 종료 시그널 처리
process.on("SIGINT", () => {
  console.log("\n[Mock KIS] 종료 중...");
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.stop();
  process.exit(0);
});

console.log("[Mock KIS] Ctrl+C로 종료할 수 있습니다.");
