import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { KisWebSocketClient } from "./src/core/infrastructure/market/kis-websocket.ts";
import { getScreenedStockCodes } from "./src/core/infrastructure/market/screened-stocks-repository.infra.ts";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// Next.js 앱 초기화
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// KIS WebSocket 클라이언트 생성
const kisClient = new KisWebSocketClient();
let isKisConnected = false;

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
  } else {
    console.log("[Server] 선별 종목 없음. 자동 구독 건너뜀.");
  }
}

app.prepare().then(async () => {
  // KIS WebSocket 연결 및 선별 종목 구독
  try {
    await initKisWebSocket();
    isKisConnected = true;
  } catch (error) {
    console.error("[Server] ❌ KIS WebSocket 초기화 실패:", error);
    console.error("[Server] ⚠️  실시간 시세 기능이 비활성화됩니다.");
    isKisConnected = false;
  }
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

  // KIS WebSocket 데이터 수신 → Socket.io로 브로드캐스트
  kisClient.onDataReceived = (data) => {
    // 실시간 데이터를 해당 종목을 구독 중인 클라이언트들에게 전송
    if (data.stockCode) {
      io.to(`stock:${data.stockCode}`).emit("price-update", data);
    }
  };

  // KIS 연결 상태 변경 시 모든 클라이언트에 전파
  kisClient.onConnectionStatusChanged = (connected) => {
    console.log(`[Server] KIS 연결 상태 변경: ${connected ? "연결됨" : "연결 해제"}`);
    isKisConnected = connected;
    io.emit("kis-status", { connected });
  };

  // 클라이언트별 구독 종목 추적
  const clientSubscriptions = new Map();

  // Socket.io 이벤트 핸들러
  io.on("connection", (socket) => {
    if (dev) console.log("[Socket.io] 클라이언트 연결:", socket.id);

    // 클라이언트 구독 목록 초기화
    clientSubscriptions.set(socket.id, new Set());

    // KIS 연결 상태를 클라이언트에 전달
    socket.emit("kis-status", { connected: isKisConnected });

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
  });
});
