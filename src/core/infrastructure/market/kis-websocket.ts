import WebSocket from "ws";
import { RealtimePrice, ChangeSign } from "@/core/entities/stock-price.entity";
import { getCached } from "@/shared/lib/utils/cache";

const KIS_WS_URL = "ws://ops.koreainvestment.com:21000";
const KIS_APPROVAL_KEY = "kis-approval-key";

/**
 * KIS H0STCNT0 응답 필드 인덱스
 * @see https://apiportal.koreainvestment.com (실시간 국내주식 체결가)
 */
const KIS_FIELD_INDEX = {
  STOCK_CODE: 0, // 유가증권 단축 종목코드
  TIME: 1, // 주식 체결 시간 (HHMMSS)
  PRICE: 2, // 주식 현재가
  SIGN: 3, // 전일 대비 부호 (1:상한, 2:상승, 3:보합, 4:하한, 5:하락)
  CHANGE: 4, // 전일 대비
  VOLUME: 13, // 누적 거래량
  DATE: 33, // 영업일자 (YYYYMMDD)
} as const;

/**
 * KIS 전일대비 부호 → ChangeSign 변환
 */
function parseChangeSign(sign: string): ChangeSign {
  switch (sign) {
    case "1": // 상한
    case "2": // 상승
      return "rise";
    case "4": // 하한
    case "5": // 하락
      return "fall";
    default: // 3: 보합
      return "flat";
  }
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
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000; // 5초

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

        // 5. 연결 종료 → 자동 재연결 시도
        this.ws.on("close", () => {
          console.log("[KIS WS] 연결 종료");
          this.isConnected = false;
          this.attemptReconnect();
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

      // PINGPONG 메시지 처리: 동일한 메시지로 응답하여 연결 유지
      if (message.includes('"tr_id":"PINGPONG"')) {
        this.ws?.send(message);
        return;
      }

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
   * KIS 메시지 파싱
   * 실시간 데이터는 '0'으로 시작하고 '|'로 구분됨
   * 형식: 0|H0STCNT0|개수|데이터(^로 구분)
   */
  private parseMessage(message: string): RealtimePrice | null {
    if (!message || message.trim().length === 0) {
      return null;
    }

    // 실시간 데이터가 아니면 무시 (응답 메시지 등)
    if (message[0] !== "0") {
      return null;
    }

    try {
      const parts = message.split("|");
      if (parts.length < 4) {
        return null;
      }

      const trId = parts[1];
      // H0STCNT0 (실시간 체결가)만 처리
      if (trId !== "H0STCNT0") {
        return null;
      }

      // 실제 데이터는 parts[3]에 있고, '^'로 구분됨
      const dataStr = parts[3];
      const fields = dataStr.split("^");

      const stockCode = fields[KIS_FIELD_INDEX.STOCK_CODE];
      const time = fields[KIS_FIELD_INDEX.TIME];
      const date = fields[KIS_FIELD_INDEX.DATE];
      const price = parseInt(fields[KIS_FIELD_INDEX.PRICE], 10);
      const change = parseInt(fields[KIS_FIELD_INDEX.CHANGE], 10);
      const sign = fields[KIS_FIELD_INDEX.SIGN];
      const volume = parseInt(fields[KIS_FIELD_INDEX.VOLUME], 10);

      // 등락률 계산: (전일대비 / 전일종가) * 100
      const prevPrice = price - change;
      const changeRate = prevPrice !== 0 ? (change / prevPrice) * 100 : 0;

      // timestamp: YYYYMMDD + HHMMSS → ISO 형식
      const timestamp = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}+09:00`;

      return {
        stockCode,
        timestamp,
        price,
        change,
        changeRate: Math.round(changeRate * 100) / 100, // 소수점 2자리
        changeSign: parseChangeSign(sign),
        volume,
      };
    } catch (error) {
      console.error("[KIS WS] 파싱 에러:", error);
      return null;
    }
  }

  /**
   * 여러 종목 일괄 구독 요청
   */
  subscribeMultiple(stockCodes: string[]): void {
    if (!this.isConnected || !this.ws) {
      console.error("[KIS WS] 연결되지 않았습니다.");
      return;
    }

    console.log(`[KIS WS] ${stockCodes.length}개 종목 일괄 구독 시작`);
    for (const stockCode of stockCodes) {
      this.subscribe(stockCode);
    }
    console.log(`[KIS WS] ${stockCodes.length}개 종목 일괄 구독 완료`);
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
  onDataReceived?: (data: RealtimePrice) => void;

  /**
   * 자동 재연결 시도
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[KIS WS] 최대 재연결 시도 횟수(${this.maxReconnectAttempts}회) 초과. 재연결 중단.`);
      this.onConnectionStatusChanged?.(false);
      return;
    }

    this.reconnectAttempts++;
    console.log(`[KIS WS] ${this.reconnectDelay / 1000}초 후 재연결 시도 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(async () => {
      try {
        await this.connect();
        console.log("[KIS WS] 재연결 성공");
        this.reconnectAttempts = 0; // 성공 시 카운터 리셋
        this.onConnectionStatusChanged?.(true);
      } catch (error) {
        console.error("[KIS WS] 재연결 실패:", error);
      }
    }, this.reconnectDelay);
  }

  /**
   * 연결 상태 변경 시 호출될 콜백
   */
  onConnectionStatusChanged?: (connected: boolean) => void;

  /**
   * 연결 종료
   */
  disconnect(): void {
    if (this.ws) {
      console.log("[KIS WS] 연결 종료 요청");
      this.reconnectAttempts = this.maxReconnectAttempts; // 수동 종료 시 재연결 방지
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }
}
