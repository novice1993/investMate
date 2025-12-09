"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

// ============================================================================
// Types
// ============================================================================

interface FadeInProps {
  children: ReactNode;
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
 * 페이드 인 애니메이션 래퍼
 *
 * @example
 * <FadeIn>
 *   <div>콘텐츠</div>
 * </FadeIn>
 */
export function FadeIn({ children, delay = 0, duration = 0.3, className }: FadeInProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration, delay, ease: "easeOut" }} className={className}>
      {children}
    </motion.div>
  );
}
