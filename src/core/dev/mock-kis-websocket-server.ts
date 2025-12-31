/**
 * @fileoverview KIS WebSocket Mock 서버
 *
 * 휴장일에도 실시간 체결가 테스트가 가능하도록 KIS WebSocket을 모방합니다.
 * - 구독 요청을 받아 종목 관리
 * - 1~3초 간격으로 랜덤 체결가 생성/전송
 * - PINGPONG keepalive 지원
 * - Supabase에서 마지막 종가를 가져와 초기 가격으로 사용
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { WebSocketServer, WebSocket } from "ws";

// ============================================================================
// Types
// ============================================================================

interface StockState {
  price: number;
  prevClose: number;
  volume: number;
}

interface SubscriptionRequest {
  header: {
    approval_key: string;
    custtype: string;
    tr_type: "1" | "2"; // 1: 등록, 2: 해제
    "content-type": string;
  };
  body: {
    input: {
      tr_id: string;
      tr_key: string; // 종목코드
    };
  };
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PORT = 21001;
const PRICE_UPDATE_INTERVAL_MIN = 100; // 100ms (실제 KIS 수준)
const PRICE_UPDATE_INTERVAL_MAX = 300; // 300ms
const PINGPONG_INTERVAL = 30000; // 30초
const PRICE_CHANGE_PERCENT = 0.3; // ±0.3% 변동폭 (실제 체결가 수준)
const STOCKS_PER_UPDATE_MIN = 5; // 한 번에 업데이트할 종목 수 (최소)
const STOCKS_PER_UPDATE_MAX = 10; // 한 번에 업데이트할 종목 수 (최대)

// ============================================================================
// Mock Server Class
// ============================================================================

export class MockKisWebSocketServer {
  private wss: WebSocketServer | null = null;
  private subscribedStocks: Map<string, StockState> = new Map();
  private clients: Set<WebSocket> = new Set();
  private priceUpdateTimer: NodeJS.Timeout | null = null;
  private pingpongTimer: NodeJS.Timeout | null = null;
  private supabase: SupabaseClient | null = null;

  constructor(private port: number = DEFAULT_PORT) {}

  /**
   * Mock 서버 시작
   */
  start(): void {
    // Supabase 클라이언트 초기화
    this.initSupabase();

    this.wss = new WebSocketServer({ port: this.port });

    console.log(`[Mock KIS WS] 서버 시작 - ws://localhost:${this.port}`);

    this.wss.on("connection", (ws) => {
      console.log("[Mock KIS WS] 클라이언트 연결");
      this.clients.add(ws);

      ws.on("message", (data) => {
        this.handleMessage(ws, data.toString());
      });

      ws.on("close", () => {
        console.log("[Mock KIS WS] 클라이언트 연결 종료");
        this.clients.delete(ws);
      });

      ws.on("error", (error) => {
        console.error("[Mock KIS WS] 에러:", error);
      });
    });

    // 가격 업데이트 타이머 시작
    this.startPriceUpdates();

    // PINGPONG 타이머 시작
    this.startPingPong();
  }

  /**
   * Supabase 클라이언트 초기화
   */
  private initSupabase(): void {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      console.warn("[Mock KIS WS] Supabase 환경변수 없음 - 랜덤 가격 사용");
      return;
    }

    this.supabase = createClient(url, key);
    console.log("[Mock KIS WS] Supabase 클라이언트 초기화 완료");
  }

  /**
   * Supabase에서 종목의 마지막 종가 조회
   */
  private async getLastClosePrice(stockCode: string): Promise<number | null> {
    if (!this.supabase) {
      return null;
    }

    try {
      const { data, error } = await this.supabase.from("daily_prices").select("close_price").eq("stock_code", stockCode).order("date", { ascending: false }).limit(1).maybeSingle();

      if (error) {
        console.error(`[Mock KIS WS] ${stockCode} 종가 조회 에러:`, error.message);
        return null;
      }

      return data?.close_price || null;
    } catch (error) {
      console.error(`[Mock KIS WS] ${stockCode} 종가 조회 실패:`, error);
      return null;
    }
  }

  /**
   * 메시지 처리
   */
  private handleMessage(ws: WebSocket, message: string): void {
    try {
      // PINGPONG 응답 확인
      if (message.includes('"tr_id":"PINGPONG"')) {
        console.log("[Mock KIS WS] PINGPONG 응답 수신");
        return;
      }

      // 구독 요청 파싱
      const request: SubscriptionRequest = JSON.parse(message);
      const { tr_type } = request.header;
      const { tr_id, tr_key: stockCode } = request.body.input;

      if (tr_id !== "H0STCNT0") {
        console.log(`[Mock KIS WS] 미지원 TR: ${tr_id}`);
        return;
      }

      if (tr_type === "1") {
        // 구독 등록 (비동기)
        this.subscribeStock(stockCode);
      } else if (tr_type === "2") {
        // 구독 해제
        this.unsubscribeStock(stockCode);
      }
    } catch (error) {
      console.error("[Mock KIS WS] 메시지 파싱 에러:", error);
    }
  }

  /**
   * 종목 구독 (Supabase에서 마지막 종가 조회)
   */
  private async subscribeStock(stockCode: string): Promise<void> {
    if (this.subscribedStocks.has(stockCode)) {
      console.log(`[Mock KIS WS] ${stockCode} 이미 구독 중`);
      return;
    }

    // Supabase에서 마지막 종가 조회
    let initialPrice = await this.getLastClosePrice(stockCode);

    // 조회 실패 시 랜덤 가격 사용 (fallback)
    if (!initialPrice) {
      initialPrice = Math.floor(Math.random() * 450000) + 50000;
      console.log(`[Mock KIS WS] ${stockCode} 구독 등록 (랜덤 가격: ${initialPrice.toLocaleString()}원)`);
    } else {
      console.log(`[Mock KIS WS] ${stockCode} 구독 등록 (마지막 종가: ${initialPrice.toLocaleString()}원)`);
    }

    this.subscribedStocks.set(stockCode, {
      price: initialPrice,
      prevClose: initialPrice,
      volume: 0,
    });
  }

  /**
   * 종목 구독 해제
   */
  private unsubscribeStock(stockCode: string): void {
    if (this.subscribedStocks.delete(stockCode)) {
      console.log(`[Mock KIS WS] ${stockCode} 구독 해제`);
    }
  }

  /**
   * 가격 업데이트 시작
   */
  private startPriceUpdates(): void {
    const scheduleNextUpdate = () => {
      const delay = Math.random() * (PRICE_UPDATE_INTERVAL_MAX - PRICE_UPDATE_INTERVAL_MIN) + PRICE_UPDATE_INTERVAL_MIN;

      this.priceUpdateTimer = setTimeout(() => {
        this.broadcastPriceUpdates();
        scheduleNextUpdate();
      }, delay);
    };

    scheduleNextUpdate();
  }

  /**
   * 랜덤 종목의 가격 업데이트 브로드캐스트
   * 실제 KIS처럼 일부 종목만 빈번하게 업데이트
   */
  private broadcastPriceUpdates(): void {
    if (this.clients.size === 0 || this.subscribedStocks.size === 0) {
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, ""); // HHMMSS

    // 랜덤하게 5~10개 종목 선택
    const stockCodes = Array.from(this.subscribedStocks.keys());
    const updateCount = Math.floor(Math.random() * (STOCKS_PER_UPDATE_MAX - STOCKS_PER_UPDATE_MIN + 1)) + STOCKS_PER_UPDATE_MIN;
    const selectedStocks = this.getRandomItems(stockCodes, Math.min(updateCount, stockCodes.length));

    for (const stockCode of selectedStocks) {
      const state = this.subscribedStocks.get(stockCode);
      if (!state) continue;

      // 실제 체결가처럼 작은 변동폭 (±0.3%)
      const changePercent = (Math.random() - 0.5) * 2 * PRICE_CHANGE_PERCENT;
      const priceChange = Math.floor(state.price * (changePercent / 100));
      const newPrice = Math.max(100, state.price + priceChange); // 최소 100원

      // 거래량 증가 (100 ~ 10,000)
      const volumeIncrease = Math.floor(Math.random() * 9900) + 100;
      state.volume += volumeIncrease;
      state.price = newPrice;

      // 전일대비
      const change = newPrice - state.prevClose;
      const sign = change > 0 ? "2" : change < 0 ? "5" : "3"; // 2:상승, 3:보합, 5:하락

      // KIS 형식 메시지 생성
      const message = this.createKisMessage(stockCode, timeStr, newPrice, sign, Math.abs(change), state.volume, dateStr);

      // 모든 클라이언트에 전송
      for (const client of this.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }
    }
  }

  /**
   * 배열에서 랜덤하게 n개 항목 선택
   */
  private getRandomItems<T>(arr: T[], n: number): T[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  }

  /**
   * KIS 형식 메시지 생성
   * 형식: 0|H0STCNT0|1|field0^field1^...^field33
   */
  private createKisMessage(stockCode: string, time: string, price: number, sign: string, change: number, volume: number, date: string): string {
    // 34개 필드 (인덱스 0~33)
    const fields = new Array(34).fill("0");

    fields[0] = stockCode; // 종목코드
    fields[1] = time; // 체결시간 (HHMMSS)
    fields[2] = price.toString(); // 현재가
    fields[3] = sign; // 전일대비 부호
    fields[4] = change.toString(); // 전일대비
    fields[13] = volume.toString(); // 누적거래량
    fields[33] = date; // 영업일자 (YYYYMMDD)

    return `0|H0STCNT0|1|${fields.join("^")}`;
  }

  /**
   * PINGPONG 시작
   */
  private startPingPong(): void {
    this.pingpongTimer = setInterval(() => {
      const pingMessage = JSON.stringify({ tr_id: "PINGPONG" });

      for (const client of this.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(pingMessage);
        }
      }
    }, PINGPONG_INTERVAL);
  }

  /**
   * 서버 종료
   */
  stop(): void {
    if (this.priceUpdateTimer) {
      clearTimeout(this.priceUpdateTimer);
    }
    if (this.pingpongTimer) {
      clearInterval(this.pingpongTimer);
    }
    if (this.wss) {
      this.wss.close();
      console.log("[Mock KIS WS] 서버 종료");
    }
  }

  /**
   * 현재 구독 종목 수 반환
   */
  getSubscribedCount(): number {
    return this.subscribedStocks.size;
  }
}
