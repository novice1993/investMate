import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { KisWebSocketClient } from "./src/core/infrastructure/market/kis-websocket.ts";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// Next.js 앱 초기화
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// KIS WebSocket 클라이언트 생성
const kisClient = new KisWebSocketClient();

app.prepare().then(async () => {
  // KIS WebSocket 연결
  try {
    console.log("[Server] KIS WebSocket 연결 시도...");
    await kisClient.connect();
    console.log("[Server] ✅ KIS WebSocket 연결 완료");
  } catch (error) {
    console.error("[Server] ❌ KIS WebSocket 연결 실패:", error);
    console.error("[Server] ⚠️  실시간 시세 기능이 비활성화됩니다.");
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

  // Socket.io 이벤트 핸들러
  io.on("connection", (socket) => {
    if (dev) console.log("[Socket.io] 클라이언트 연결:", socket.id);

    // 프론트엔드 구독 요청 → KIS에 구독 전달
    socket.on("subscribe", ({ stockCode }) => {
      if (dev) console.log(`[Socket.io] ${stockCode} 구독 요청`);

      // Socket.io Room 참여
      socket.join(`stock:${stockCode}`);

      // KIS WebSocket에 구독 요청
      kisClient.subscribe(stockCode);
    });

    // 프론트엔드 구독 해제 → KIS에 구독 해제 전달
    socket.on("unsubscribe", ({ stockCode }) => {
      if (dev) console.log(`[Socket.io] ${stockCode} 구독 해제`);

      // Socket.io Room 나가기
      socket.leave(`stock:${stockCode}`);

      // KIS WebSocket에 구독 해제 요청
      kisClient.unsubscribe(stockCode);
    });

    socket.on("disconnect", () => {
      if (dev) console.log("[Socket.io] 클라이언트 연결 해제:", socket.id);
    });
  });

  // 서버 시작
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Next.js + Socket.io 서버 실행 중`);
  });
});
