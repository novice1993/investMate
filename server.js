import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// Next.js 앱 초기화
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
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

  // Socket.io 이벤트 핸들러
  io.on("connection", (socket) => {
    console.log("[Socket.io] 클라이언트 연결:", socket.id);

    // TODO: 종목 구독 이벤트 (다음 단계에서 구현)
    socket.on("subscribe", ({ stockCode }) => {
      console.log(`[Socket.io] ${stockCode} 구독 요청`);
      socket.join(`stock:${stockCode}`);
    });

    // TODO: 구독 해제 이벤트
    socket.on("unsubscribe", ({ stockCode }) => {
      console.log(`[Socket.io] ${stockCode} 구독 해제`);
      socket.leave(`stock:${stockCode}`);
    });

    socket.on("disconnect", () => {
      console.log("[Socket.io] 클라이언트 연결 해제:", socket.id);
    });
  });

  // 서버 시작
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Next.js + Socket.io 서버 실행 중`);
  });
});
