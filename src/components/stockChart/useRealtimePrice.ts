"use client";

import { useEffect, useState } from "react";
import { RealtimePrice } from "@/core/entities/stock-price.entity";
import { useSocketInstance } from "@/shared/providers/SocketProvider";

// ============================================================================
// Types
// ============================================================================

interface UseRealtimePriceReturn {
  prices: Map<string, RealtimePrice>;
  isConnected: boolean;
  isKisConnected: boolean;
  error: string | null;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * 실시간 주가 데이터 훅
 * - SocketProvider의 공유 Socket 인스턴스 사용
 * - 서버에서 40개 종목 일괄 구독 중 (개별 구독 불필요)
 */
export function useRealtimePrice(): UseRealtimePriceReturn {
  const socket = useSocketInstance();
  const [prices, setPrices] = useState<Map<string, RealtimePrice>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isKisConnected, setIsKisConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    // 이미 연결되어 있으면 상태 동기화
    setIsConnected(socket.connected);

    const handleConnect = () => {
      console.log("[RealtimePrice] 서버 연결 성공");
      setIsConnected(true);
      // 연결 직후 KIS 상태 요청
      socket.emit("request-kis-status");
    };

    const handleDisconnect = () => {
      console.log("[RealtimePrice] 서버 연결 해제");
      setIsConnected(false);
      setIsKisConnected(false);
    };

    const handleKisStatus = ({ connected }: { connected: boolean }) => {
      console.log("[RealtimePrice] KIS 연결 상태:", connected);
      setIsKisConnected(connected);
      if (!connected) {
        setError("실시간 시세 서비스가 비활성화되어 있습니다 (장 마감 또는 서버 오류)");
      } else {
        setError(null);
      }
    };

    const handlePriceUpdate = (data: RealtimePrice) => {
      setPrices((prev) => {
        const next = new Map(prev);
        next.set(data.stockCode, data);
        return next;
      });
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("kis-status", handleKisStatus);
    socket.on("price-update", handlePriceUpdate);

    // 이벤트 리스너 등록 후, 이미 연결되어 있다면 KIS 상태 요청
    // (Race Condition 방지: 리스너 등록 전에 발생한 kis-status 이벤트 대응)
    if (socket.connected) {
      console.log("[RealtimePrice] 이미 연결됨 - KIS 상태 요청");
      socket.emit("request-kis-status");
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("kis-status", handleKisStatus);
      socket.off("price-update", handlePriceUpdate);
    };
  }, [socket]);

  return {
    prices,
    isConnected,
    isKisConnected,
    error,
  };
}
