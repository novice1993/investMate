"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

// ============================================================================
// Types
// ============================================================================

type Direction = "left" | "right" | "up" | "down";

interface SlideInProps {
  children: ReactNode;
  /** 슬라이드 방향 */
  direction?: Direction;
  /** 이동 거리 (px) */
  distance?: number;
  /** 애니메이션 지연 시간 (초) */
  delay?: number;
  /** 애니메이션 지속 시간 (초) */
  duration?: number;
  /** 추가 className */
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function getInitialPosition(direction: Direction, distance: number) {
  switch (direction) {
    case "left":
      return { x: -distance, y: 0 };
    case "right":
      return { x: distance, y: 0 };
    case "up":
      return { x: 0, y: -distance };
    case "down":
      return { x: 0, y: distance };
  }
}

// ============================================================================
// Component
// ============================================================================

/**
 * 슬라이드 인 애니메이션 래퍼
 *
 * @example
 * <SlideIn direction="right">
 *   <Panel />
 * </SlideIn>
 */
export function SlideIn({ children, direction = "right", distance = 16, delay = 0, duration = 0.3, className }: SlideInProps) {
  const initialPosition = getInitialPosition(direction, distance);

  return (
    <motion.div
      initial={{ opacity: 0, ...initialPosition }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, ...initialPosition }}
      transition={{ duration, delay, ease: [0.4, 0, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
