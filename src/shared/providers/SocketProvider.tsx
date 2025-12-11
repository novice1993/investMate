"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
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
 * - 상태 관리는 각 훅에서 담당 (리렌더링 최소화)
 */
export function SocketProvider({ children }: SocketProviderProps) {
  const socketRef = useRef<Socket | null>(null);

  // Socket 인스턴스 생성 (최초 1회)
  if (!socketRef.current) {
    socketRef.current = io({
      transports: ["websocket"],
    });
  }

  // 클린업
  useEffect(() => {
    const socket = socketRef.current;

    return () => {
      if (socket) {
        socket.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

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
