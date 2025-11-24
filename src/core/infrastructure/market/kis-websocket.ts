import WebSocket from "ws";
import { getCached } from "@/shared/lib/utils/cache";

const KIS_WS_URL = "ws://ops.koreainvestment.com:21000";
const KIS_APPROVAL_KEY = "kis-approval-key";

/**
 * KIS 실시간 시세 데이터
 */
export interface KisRealtimeData {
  raw: string; // 원본 메시지
  stockCode?: string; // 종목코드 (파싱 후)
  price?: number; // 현재가 (파싱 후)
  timestamp?: string; // 시간 (파싱 후)
}

/**
 * KIS WebSocket 클라이언트
 *
 * 역할: 우리 서버가 한국투자증권 WebSocket 서버에 연결하고
 *       실시간 시세 데이터를 받아오는 클라이언트
 */
export class KisWebSocketClient {
  private ws: WebSocket | null = null;
  private approvalKey: string = "";
  private isConnected: boolean = false;

  /**
   * KIS WebSocket 서버에 연결
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 1. Approval Key 가져오기 (initialization.service.ts에서 이미 캐시에 저장됨)
        const approvalKey = getCached<string>(KIS_APPROVAL_KEY);
        if (!approvalKey) {
          throw new Error("Approval Key가 초기화되지 않았습니다.");
        }
        this.approvalKey = approvalKey;

        console.log("[KIS WS] 연결 시도...");

        // 2. WebSocket 연결
        this.ws = new WebSocket(KIS_WS_URL);

        // 3. 연결 성공
        this.ws.on("open", () => {
          console.log("[KIS WS] 연결 성공");
          this.isConnected = true;
          resolve();
        });

        // 4. 에러 처리
        this.ws.on("error", (error) => {
          console.error("[KIS WS] 에러:", error);
          this.isConnected = false;
          reject(error);
        });

        // 5. 연결 종료
        this.ws.on("close", () => {
          console.log("[KIS WS] 연결 종료");
          this.isConnected = false;
        });

        // 6. 메시지 수신 (KIS에서 실시간 데이터가 올 때마다 호출됨)
        this.ws.on("message", (data) => {
          this.handleMessage(data);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * KIS에서 수신한 메시지 처리
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = data.toString();
      console.log("[KIS WS] 메시지 수신:", message.substring(0, 100)); // 앞 100자만 로그

      // 메시지 파싱하고 콜백 호출
      const parsed = this.parseMessage(message);
      if (parsed && this.onDataReceived) {
        this.onDataReceived(parsed);
      }
    } catch (error) {
      console.error("[KIS WS] 메시지 처리 에러:", error);
    }
  }

  /**
   * KIS 메시지 파싱 (간단한 버전)
   */
  private parseMessage(message: string): KisRealtimeData | null {
    if (!message || message.trim().length === 0) {
      return null;
    }

    // 일단 원본 메시지를 그대로 반환 (나중에 파싱 로직 추가)
    return { raw: message };
  }

  /**
   * 종목 실시간 시세 구독 요청
   */
  subscribe(stockCode: string): void {
    if (!this.isConnected || !this.ws) {
      console.error("[KIS WS] 연결되지 않았습니다.");
      return;
    }

    // KIS WebSocket 메시지 포맷
    const message = {
      header: {
        approval_key: this.approvalKey,
        custtype: "P", // P: 개인, B: 법인
        tr_type: "1", // 1: 등록, 2: 해제
        "content-type": "utf-8",
      },
      body: {
        input: {
          tr_id: "H0STCNT0", // 실시간 체결가 (KIS TR ID)
          tr_key: stockCode, // 종목코드
        },
      },
    };

    console.log(`[KIS WS] ${stockCode} 구독 요청`);
    this.ws.send(JSON.stringify(message));
  }

  /**
   * 종목 구독 해제
   */
  unsubscribe(stockCode: string): void {
    if (!this.isConnected || !this.ws) {
      console.error("[KIS WS] 연결되지 않았습니다.");
      return;
    }

    const message = {
      header: {
        approval_key: this.approvalKey,
        custtype: "P",
        tr_type: "2", // 2: 해제
        "content-type": "utf-8",
      },
      body: {
        input: {
          tr_id: "H0STCNT0",
          tr_key: stockCode,
        },
      },
    };

    console.log(`[KIS WS] ${stockCode} 구독 해제`);
    this.ws.send(JSON.stringify(message));
  }

  /**
   * 실시간 데이터 수신 시 호출될 콜백
   * server.js에서 이 콜백을 설정하면, KIS에서 데이터가 올 때마다 호출됨
   */
  onDataReceived?: (data: KisRealtimeData) => void;

  /**
   * 연결 종료
   */
  disconnect(): void {
    if (this.ws) {
      console.log("[KIS WS] 연결 종료 요청");
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }
}
