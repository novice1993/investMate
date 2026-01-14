"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { io, Socket } from "socket.io-client";

// ============================================================================
// Context
// ============================================================================

const SocketContext = createContext<Socket | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface SocketProviderProps {
  children: ReactNode;
}

/**
 * Socket.io 인스턴스를 앱 전체에서 공유하는 Provider
 * - 단일 Socket 인스턴스만 유지
 * - Socket 연결 완료 후 children 렌더 (race condition 방지)
 * - 상태 관리는 각 훅에서 담당 (리렌더링 최소화)
 */
export function SocketProvider({ children }: SocketProviderProps) {
  const socketRef = useRef<Socket | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Socket 연결 및 이벤트 설정
  useEffect(() => {
    const socket = io({
      transports: ["websocket"],
    });

    // 연결 완료 시 children 렌더 허용
    socket.on("connect", () => {
      console.log("[SocketProvider] Socket 연결 완료");
      setIsReady(true);
    });

    // 이미 연결되어 있으면 즉시 렌더 허용
    if (socket.connected) {
      console.log("[SocketProvider] Socket 이미 연결됨");
      setIsReady(true);
    }

    // 타임아웃: 5초 후에도 연결 안되면 진행
    const timeout = setTimeout(() => {
      console.warn("[SocketProvider] Socket 연결 타임아웃 - 기본 모드로 진행");
      setIsReady(true);
    }, 5000);

    socketRef.current = socket;

    return () => {
      clearTimeout(timeout);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Socket 연결 대기 중
  if (!isReady) {
    return <div style={{ minHeight: "100vh", background: "#000" }} />;
  }

  return <SocketContext.Provider value={socketRef.current}>{children}</SocketContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * 공유 Socket 인스턴스를 가져오는 훅
 */
export function useSocketInstance(): Socket | null {
  return useContext(SocketContext);
}
