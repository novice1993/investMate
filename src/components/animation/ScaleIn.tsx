"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

// ============================================================================
// Types
// ============================================================================

interface ScaleInProps {
  children: ReactNode;
  /** 초기 스케일 (0~1) */
  initialScale?: number;
  /** 애니메이션 지연 시간 (초) */
  delay?: number;
  /** 애니메이션 지속 시간 (초) */
  duration?: number;
  /** 추가 className */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * 스케일 인 애니메이션 래퍼
 *
 * @example
 * <ScaleIn>
 *   <Card />
 * </ScaleIn>
 */
export function ScaleIn({ children, initialScale = 0.95, delay = 0, duration = 0.2, className }: ScaleInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: initialScale }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: initialScale }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
