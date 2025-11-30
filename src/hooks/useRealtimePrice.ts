import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { RealtimePrice } from "@/core/entities/stock-price.entity";

interface UseRealtimePriceReturn {
  prices: Map<string, RealtimePrice>;
  subscribe: (stockCode: string) => void;
  unsubscribe: (stockCode: string) => void;
  isConnected: boolean;
  isKisConnected: boolean;
  error: string | null;
}

/**
 * Socket.io를 통한 실시간 주가 데이터 훅
 */
export function useRealtimePrice(): UseRealtimePriceReturn {
  const [prices, setPrices] = useState<Map<string, RealtimePrice>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isKisConnected, setIsKisConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Socket.io 클라이언트 연결 (자동으로 현재 호스트 사용)
    const socket = io({
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket.io] 서버 연결 성공");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("[Socket.io] 서버 연결 해제");
      setIsConnected(false);
      setIsKisConnected(false);
    });

    // KIS 연결 상태 수신
    socket.on("kis-status", ({ connected }: { connected: boolean }) => {
      console.log("[Socket.io] KIS 연결 상태:", connected);
      setIsKisConnected(connected);
      if (!connected) {
        setError("실시간 시세 서비스가 비활성화되어 있습니다 (장 마감 또는 서버 오류)");
      } else {
        setError(null);
      }
    });

    // 구독 에러 수신
    socket.on("subscription-error", ({ stockCode, message }: { stockCode: string; message: string }) => {
      console.error(`[Socket.io] 구독 에러 (${stockCode}):`, message);
      setError(message);
    });

    // 실시간 가격 업데이트 수신
    socket.on("price-update", (data: RealtimePrice) => {
      console.log("[Socket.io] 가격 업데이트:", data);
      setPrices((prev) => {
        const next = new Map(prev);
        next.set(data.stockCode, data);
        return next;
      });
    });

    // 클린업
    return () => {
      socket.disconnect();
    };
  }, []);

  const subscribe = useCallback((stockCode: string) => {
    if (socketRef.current?.connected) {
      console.log(`[Socket.io] ${stockCode} 구독 요청`);
      socketRef.current.emit("subscribe", { stockCode });
    }
  }, []);

  const unsubscribe = useCallback((stockCode: string) => {
    if (socketRef.current?.connected) {
      console.log(`[Socket.io] ${stockCode} 구독 해제`);
      socketRef.current.emit("unsubscribe", { stockCode });

      // 로컬 상태에서도 제거
      setPrices((prev) => {
        const next = new Map(prev);
        next.delete(stockCode);
        return next;
      });
    }
  }, []);

  return {
    prices,
    subscribe,
    unsubscribe,
    isConnected,
    isKisConnected,
    error,
  };
}
