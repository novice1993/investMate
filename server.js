import { createServer } from "http";
import { parse } from "url";
import nextEnv from "@next/env";
import next from "next";
import { Server } from "socket.io";
import { startMockSignalEmitter, refreshCachedStockCodes } from "./src/core/dev/mock-signal.ts";
import { appEvents, APP_EVENTS } from "./src/core/events/index.ts";
import { KisWebSocketClient } from "./src/core/infrastructure/market/kis-websocket.ts";
import { initializePriceCache, updateRealtimePrice, getPriceDataForSignal, getCachedStockCodes, refreshPriceCache } from "./src/core/infrastructure/market/price-cache.infra.ts";
import { getScreenedStockCodes } from "./src/core/infrastructure/market/screened-stocks-repository.infra.ts";
import { saveSignalAlert } from "./src/core/infrastructure/market/signal-alerts-repository.infra.ts";
import { startKisTokenRefreshScheduler } from "./src/core/services/initialization.service.ts";
import { detectSignalTriggers, SIGNAL_TRIGGER_CONFIG } from "./src/core/services/signal-trigger.service.ts";

// 환경변수 로드 (Next.js 앱 초기화 전에)
nextEnv.loadEnvConfig(process.cwd());

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// Next.js 앱 초기화
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// KIS WebSocket 클라이언트 생성
const kisClient = new KisWebSocketClient();
let isKisConnected = false;

// 현재 서버에서 구독 중인 선별 종목 목록 (스크리닝 갱신 시 구독 교체용)
let currentScreenedStockCodes = [];

// ============================================================================
// Signal State Management
// ============================================================================

/**
 * 종목별 시그널 상태 저장
 * @type {Map<string, { rsiOversold: boolean, goldenCross: boolean, volumeSpike: boolean }>}
 */
const signalState = new Map();

/**
 * 히스테리시스를 적용하여 시그널 상태를 업데이트하고, 새로 발생한 시그널만 반환
 *
 * - RSI: 30 이하 진입 → 35 이상 해제
 * - 거래량: 2.0배 이상 진입 → 1.5배 이하 해제
 * - 골든크로스: 교차 순간만 감지 (히스테리시스 불필요)
 *
 * @param {string} stockCode
 * @param {object} signalResult - detectSignalTriggers 결과
 * @returns {{ rsiOversold: boolean, goldenCross: boolean, volumeSpike: boolean } | null} 새로 발생한 시그널 (없으면 null)
 */
function updateSignalStateAndGetChanges(stockCode, signalResult) {
  const prevState = signalState.get(stockCode);
  const defaultState = {
    rsiOversold: false,
    goldenCross: false,
    volumeSpike: false,
  };
  const prev = prevState || defaultState;

  // RSI 히스테리시스 적용
  const rsiValue = signalResult.rsi?.latest;
  let newRsiOversold;
  if (prev.rsiOversold) {
    // 이미 과매도 상태 → 35 이상이어야 해제
    newRsiOversold = rsiValue !== null && rsiValue < SIGNAL_TRIGGER_CONFIG.rsi.recoveryThreshold;
  } else {
    // 정상 상태 → 30 이하여야 진입
    newRsiOversold = rsiValue !== null && rsiValue <= SIGNAL_TRIGGER_CONFIG.rsi.oversoldThreshold;
  }

  // 거래량 스파이크 히스테리시스 적용
  const volumeRatio = signalResult.volumeSpike?.ratio ?? 0;
  let newVolumeSpike;
  if (prev.volumeSpike) {
    // 이미 급등 상태 → 1.5배 이하여야 해제
    newVolumeSpike = volumeRatio > SIGNAL_TRIGGER_CONFIG.volumeSpike.recoveryThreshold;
  } else {
    // 정상 상태 → 2.0배 이상이어야 진입
    newVolumeSpike = volumeRatio >= SIGNAL_TRIGGER_CONFIG.volumeSpike.threshold;
  }

  // 골든크로스는 교차 순간만 감지 (히스테리시스 불필요)
  const newGoldenCross = signalResult.triggers.goldenCross;

  const newState = {
    rsiOversold: newRsiOversold,
    goldenCross: newGoldenCross,
    volumeSpike: newVolumeSpike,
  };

  // 새로 발생한 시그널 감지 (false → true 전이)
  const changedTriggers = {
    rsiOversold: !prev.rsiOversold && newState.rsiOversold,
    goldenCross: !prev.goldenCross && newState.goldenCross,
    volumeSpike: !prev.volumeSpike && newState.volumeSpike,
  };

  // 상태 업데이트
  signalState.set(stockCode, newState);

  // 새로 발생한 시그널이 있는지 확인
  const hasNewTrigger = changedTriggers.rsiOversold || changedTriggers.goldenCross || changedTriggers.volumeSpike;

  return hasNewTrigger ? changedTriggers : null;
}

/**
 * 가격 캐시 초기화 (일봉 데이터 메모리 로딩)
 */
async function initPriceCache() {
  console.log("[Server] 가격 캐시 초기화 시작...");
  await initializePriceCache();
  console.log("[Server] ✅ 가격 캐시 초기화 완료");
}

/**
 * 서버 시작 시 일봉 데이터 기반으로 초기 시그널 상태 계산
 * 이후 실시간 체결가 수신 시 상태 전이만 감지
 */
function initializeSignalState() {
  console.log("[Server] 초기 시그널 상태 계산 시작...");

  const stockCodes = getCachedStockCodes();
  let signalCount = 0;

  for (const stockCode of stockCodes) {
    const priceData = getPriceDataForSignal(stockCode);
    if (!priceData || priceData.length < 20) continue;

    const signalResult = detectSignalTriggers(stockCode, priceData, SIGNAL_TRIGGER_CONFIG);

    // 초기 상태 계산 (히스테리시스 진입 조건 기준)
    const rsiValue = signalResult.rsi?.latest;
    const volumeRatio = signalResult.volumeSpike?.ratio ?? 0;

    const initialState = {
      rsiOversold: rsiValue !== null && rsiValue <= SIGNAL_TRIGGER_CONFIG.rsi.oversoldThreshold,
      goldenCross: signalResult.triggers.goldenCross,
      volumeSpike: volumeRatio >= SIGNAL_TRIGGER_CONFIG.volumeSpike.threshold,
    };

    signalState.set(stockCode, initialState);

    const hasAnyTrigger = initialState.rsiOversold || initialState.goldenCross || initialState.volumeSpike;
    if (hasAnyTrigger) {
      signalCount++;
      console.log(`[Signal Init] ${stockCode}:`, initialState);
    }
  }

  console.log(`[Server] ✅ 초기 시그널 상태 계산 완료: ${signalCount}개 종목에서 시그널 감지`);
}

/**
 * KIS WebSocket 연결 및 선별 종목 구독
 */
async function initKisWebSocket() {
  console.log("[Server] KIS WebSocket 연결 시도...");
  await kisClient.connect();
  console.log("[Server] ✅ KIS WebSocket 연결 완료");

  const stockCodes = await getScreenedStockCodes();
  if (stockCodes.length > 0) {
    console.log(`[Server] 선별 종목 ${stockCodes.length}개 자동 구독 시작...`);
    kisClient.subscribeMultiple(stockCodes);
    currentScreenedStockCodes = stockCodes; // 현재 구독 목록 저장
  } else {
    console.log("[Server] 선별 종목 없음. 자동 구독 건너뜀.");
  }
}

/**
 * 선별 종목 변경 시 KIS WebSocket 구독 갱신
 * @param {string[]} newStockCodes - 새로 선별된 종목 코드 목록
 */
function updateKisSubscriptions(newStockCodes) {
  if (!isKisConnected) {
    console.log("[Server] KIS 연결 안됨. 구독 갱신 스킵.");
    return;
  }

  // 1. 기존 구독 해제
  if (currentScreenedStockCodes.length > 0) {
    kisClient.unsubscribeMultiple(currentScreenedStockCodes);
  }

  // 2. 새 종목 구독
  if (newStockCodes.length > 0) {
    kisClient.subscribeMultiple(newStockCodes);
  }

  // 3. 현재 구독 목록 업데이트
  currentScreenedStockCodes = newStockCodes;
  console.log("[Server] ✅ KIS 구독 갱신 완료");
}

app.prepare().then(async () => {
  // 1. 가격 캐시 초기화 (일봉 데이터)
  try {
    await initPriceCache();
  } catch (error) {
    console.error("[Server] ❌ 가격 캐시 초기화 실패:", error);
    console.error("[Server] ⚠️  시그널 알림 기능이 비활성화됩니다.");
  }

  // 2. 초기 시그널 상태 계산 (일봉 기준)
  try {
    initializeSignalState();
  } catch (error) {
    console.error("[Server] ❌ 초기 시그널 계산 실패:", error);
  }

  // 3. KIS WebSocket 연결 및 선별 종목 구독
  try {
    await initKisWebSocket();
    isKisConnected = true;
  } catch (error) {
    console.error("[Server] ❌ KIS WebSocket 초기화 실패:", error);
    console.error("[Server] ⚠️  실시간 시세 기능이 비활성화됩니다.");
    isKisConnected = false;
  }

  // 4. KIS Access Token 주기적 갱신 스케줄러 시작 (7시간 주기)
  startKisTokenRefreshScheduler();

  // HTTP Server 생성
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  // Socket.io 서버 생성 및 부착
  const io = new Server(server, {
    cors: {
      origin: dev ? "*" : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  // =========================================================================
  // 종목 스크리닝 완료 이벤트 리스너
  // - cron job에서 스크리닝 완료 시 이벤트 수신
  // - KIS WebSocket 구독 갱신 + 메모리 캐시 동기화 + 클라이언트 알림
  // =========================================================================
  appEvents.on(APP_EVENTS.SCREENING_COMPLETED, async (payload) => {
    console.log("[Server] 스크리닝 완료 이벤트 수신:", payload.screenedCount, "개 종목");

    // 전체 동기화 (원자적 처리 - 실패 시 모든 상태 유지)
    try {
      // 1. 가격 캐시 갱신
      await refreshPriceCache();

      // 2. 시그널 상태 갱신
      signalState.clear();
      initializeSignalState();

      // 3. Mock 시그널용 캐시 갱신
      await refreshCachedStockCodes();

      // 4. KIS WebSocket 구독 갱신 (메모리 업데이트 성공 후)
      updateKisSubscriptions(payload.stockCodes);

      // 5. 클라이언트에 스크리닝 완료 알림 (종목 목록 refetch 트리거)
      io.emit("screening-completed", {
        screenedCount: payload.screenedCount,
        completedAt: payload.completedAt,
      });

      // 6. 새로운 시그널 상태 전송 (클라이언트 동기화)
      const updatedSignals = Object.fromEntries(signalState);
      io.emit("signal-state-init", updatedSignals);

      console.log("[Server] ✅ 전체 동기화 및 클라이언트 알림 완료");
    } catch (error) {
      console.error("[Server] ❌ 스크리닝 동기화 실패:", error);
      console.error("[Server] ⚠️  모든 상태 유지 (일관성 보장). 다음 Health Check(08:00)에 재시도됩니다.");
    }
  });

  // KIS WebSocket 데이터 수신 → 시그널 체크 + Socket.io 브로드캐스트
  kisClient.onDataReceived = (data) => {
    if (!data.stockCode) return;

    // 1. 실시간 데이터를 모든 클라이언트에게 브로드캐스트
    // - 서버 주도형 설계: 선별 종목 40개는 클라이언트 구독 없이 일괄 전송
    io.emit("price-update", data);

    // 2. 실시간 데이터를 캐시에 반영
    updateRealtimePrice(data);

    // 3. 시그널 트리거 체크
    const priceData = getPriceDataForSignal(data.stockCode);
    if (!priceData || priceData.length < 20) return;

    const signalResult = detectSignalTriggers(data.stockCode, priceData, SIGNAL_TRIGGER_CONFIG);

    // 4. 히스테리시스 적용하여 상태 변경 감지
    const changedTriggers = updateSignalStateAndGetChanges(data.stockCode, signalResult);

    // 5. 새로 발생한 시그널이 있을 때만 알림
    if (changedTriggers) {
      console.log(`[Signal] ${data.stockCode} 새 시그널:`, changedTriggers);

      const alertData = {
        stockCode: data.stockCode,
        triggers: changedTriggers,
        rsi: signalResult.rsi,
        crossover: signalResult.crossover,
        volumeSpike: signalResult.volumeSpike,
        timestamp: new Date().toISOString(),
      };

      // DB 저장 후 id 포함하여 emit
      saveSignalAlert({
        stockCode: data.stockCode,
        triggers: changedTriggers,
        rsiValue: signalResult.rsi?.latest ?? null,
        volumeRatio: signalResult.volumeSpike?.ratio ?? null,
      })
        .then((savedAlert) => {
          if (savedAlert) {
            io.emit("signal-alert", { ...alertData, id: savedAlert.id });
          } else {
            console.error("[Signal] DB 저장 실패: 반환값 없음");
          }
        })
        .catch((err) => {
          console.error("[Signal] DB 저장 실패:", err);
        });
    }
  };

  // KIS 연결 상태 변경 시 모든 클라이언트에 전파
  kisClient.onConnectionStatusChanged = (connected) => {
    console.log(`[Server] KIS 연결 상태 변경: ${connected ? "연결됨" : "연결 해제"}`);
    isKisConnected = connected;
    io.emit("kis-status", { connected });

    // 재연결 성공 시 선별 종목 재구독
    if (connected && currentScreenedStockCodes.length > 0) {
      console.log(`[Server] 재연결 후 ${currentScreenedStockCodes.length}개 종목 재구독...`);
      kisClient.subscribeMultiple(currentScreenedStockCodes);
    }
  };

  // 클라이언트별 구독 종목 추적
  const clientSubscriptions = new Map();

  // Socket.io 이벤트 핸들러
  io.on("connection", (socket) => {
    if (dev) console.log("[Socket.io] 클라이언트 연결:", socket.id);

    // 클라이언트 구독 목록 초기화
    clientSubscriptions.set(socket.id, new Set());

    // 연결 즉시 초기 상태 전송 (타이밍이 맞는 경우를 위해)
    socket.emit("kis-status", { connected: isKisConnected });
    const currentSignals = Object.fromEntries(signalState);
    socket.emit("signal-state-init", currentSignals);

    // 클라이언트의 KIS 상태 요청 처리 (놓친 경우 대비)
    socket.on("request-kis-status", () => {
      if (dev) console.log("[Socket.io] KIS 상태 재요청 수신");
      socket.emit("kis-status", { connected: isKisConnected });
    });

    // 클라이언트의 시그널 상태 요청 처리 (놓친 경우 대비)
    socket.on("request-signal-state", () => {
      if (dev) console.log("[Socket.io] 시그널 상태 재요청 수신");
      const currentSignals = Object.fromEntries(signalState);
      socket.emit("signal-state-init", currentSignals);
    });

    // 프론트엔드 구독 요청 → KIS에 구독 전달
    socket.on("subscribe", ({ stockCode }) => {
      if (dev) console.log(`[Socket.io] ${stockCode} 구독 요청`);

      // KIS가 연결되지 않았으면 에러 응답
      if (!isKisConnected) {
        socket.emit("subscription-error", {
          stockCode,
          message: "KIS WebSocket이 연결되지 않았습니다. (장 마감 또는 서버 오류)",
        });
        return;
      }

      // Socket.io Room 참여
      socket.join(`stock:${stockCode}`);

      // 클라이언트 구독 목록에 추가
      clientSubscriptions.get(socket.id)?.add(stockCode);

      // KIS WebSocket에 구독 요청
      kisClient.subscribe(stockCode);
    });

    // 프론트엔드 구독 해제 → KIS에 구독 해제 전달
    socket.on("unsubscribe", ({ stockCode }) => {
      if (dev) console.log(`[Socket.io] ${stockCode} 구독 해제`);

      // Socket.io Room 나가기
      socket.leave(`stock:${stockCode}`);

      // 클라이언트 구독 목록에서 제거
      clientSubscriptions.get(socket.id)?.delete(stockCode);

      // KIS WebSocket에 구독 해제 요청
      kisClient.unsubscribe(stockCode);
    });

    socket.on("disconnect", () => {
      if (dev) console.log("[Socket.io] 클라이언트 연결 해제:", socket.id);

      // 해당 클라이언트가 구독 중이던 모든 종목 KIS에서 구독 해제
      const subscriptions = clientSubscriptions.get(socket.id);
      if (subscriptions) {
        subscriptions.forEach((stockCode) => {
          if (dev) console.log(`[Socket.io] ${stockCode} 자동 구독 해제 (클라이언트 disconnect)`);
          kisClient.unsubscribe(stockCode);
        });
        clientSubscriptions.delete(socket.id);
      }
    });
  });

  // 서버 시작
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Next.js + Socket.io 서버 실행 중`);

    // =========================================================================
    // [개발용] 모의 시그널 발생기
    // - 환경변수 MOCK_SIGNAL_ENABLED=true 일 때만 활성화
    // - interval: 발생 주기 (ms)
    // =========================================================================
    startMockSignalEmitter(io, {
      interval: 8000, // 8초마다 발생
    });

    // =========================================================================
    // KIS WebSocket Health Check
    // - 평일 08:00~09:00: 개장 전 DB 기준 재동기화 (10분마다)
    // - 평일 09:00~15:30: 장중 연결 모니터링 (5분마다, 끊어지면 재연결)
    // =========================================================================
    setInterval(
      async () => {
        const now = new Date();
        const koreaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
        const hour = koreaTime.getHours();
        const minute = koreaTime.getMinutes();
        const day = koreaTime.getDay(); // 0=일요일, 6=토요일

        // 주말 제외
        if (day === 0 || day === 6) return;

        const currentMinutes = hour * 60 + minute;
        const preMarketStart = 8 * 60; // 08:00
        const marketOpen = 9 * 60; // 09:00
        const marketClose = 15 * 60 + 30; // 15:30

        // 1) 개장 전 동기화 (08:00~09:00)
        if (currentMinutes >= preMarketStart && currentMinutes < marketOpen) {
          console.log("[KIS Health Check] 개장 전 동기화 시작...");
          try {
            await initKisWebSocket();
            isKisConnected = true;
            console.log("[KIS Health Check] ✅ DB 기준 재동기화 완료");
          } catch (error) {
            console.error("[KIS Health Check] ❌ 동기화 실패:", error);
            isKisConnected = false;
          }
        }

        // 2) 장중 연결 모니터링 (09:00~15:30)
        if (currentMinutes >= marketOpen && currentMinutes <= marketClose) {
          if (!isKisConnected) {
            console.log("[KIS Health Check] 🔥 장중 연결 끊김 감지 - 즉시 재연결 시도");
            try {
              await initKisWebSocket();
              isKisConnected = true;
              console.log("[KIS Health Check] ✅ 장중 재연결 성공");
            } catch (error) {
              console.error("[KIS Health Check] ❌ 장중 재연결 실패:", error);
              isKisConnected = false;
            }
          } else {
            console.log("[KIS Health Check] 장중 연결 정상");
          }
        }
      },
      5 * 60 * 1000
    ); // 5분마다 체크
  });
});
