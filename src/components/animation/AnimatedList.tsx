"use client";

import { motion, AnimatePresence } from "motion/react";
import type { ReactNode } from "react";

// ============================================================================
// Types
// ============================================================================

interface AnimatedListProps {
  children: ReactNode;
  /** 추가 className */
  className?: string;
}

interface AnimatedListItemProps {
  children: ReactNode;
  /** 고유 키 (AnimatePresence용) */
  itemKey: string | number;
  /** 추가 className */
  className?: string;
}

// ============================================================================
// Components
// ============================================================================

/**
 * 애니메이션 리스트 컨테이너
 * AnimatePresence를 래핑하여 아이템 추가/제거 애니메이션 지원
 *
 * @example
 * <AnimatedList>
 *   {items.map((item, i) => (
 *     <AnimatedListItem key={item.id} itemKey={item.id} index={i}>
 *       <Card />
 *     </AnimatedListItem>
 *   ))}
 * </AnimatedList>
 */
export function AnimatedList({ children, className }: AnimatedListProps) {
  return (
    <AnimatePresence mode="popLayout">
      <div className={className}>{children}</div>
    </AnimatePresence>
  );
}

/**
 * 애니메이션 리스트 아이템
 * 모든 아이템이 동시에 부드럽게 전환
 */
export function AnimatedListItem({ children, itemKey, className }: AnimatedListItemProps) {
  return (
    <motion.div
      key={itemKey}
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.25,
        ease: [0.4, 0, 0.2, 1], // cubic-bezier for smoother feel
        layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
