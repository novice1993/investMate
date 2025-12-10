"use client";

import { motion } from "motion/react";

// ============================================================================
// Component
// ============================================================================

/**
 * 펀더멘털 지표 섹션 스켈레톤
 * - 3개의 MetricCard 스켈레톤
 */
export function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <MetricCardSkeleton key={i} index={i} />
      ))}
    </div>
  );
}

// ============================================================================
// Sub Components
// ============================================================================

function MetricCardSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      className="p-3 bg-light-gray-5 rounded-lg text-center"
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{
        duration: 1.2,
        repeat: Infinity,
        delay: index * 0.1,
      }}
    >
      {/* 라벨 */}
      <div className="h-3 w-12 bg-light-gray-20 rounded mx-auto mb-2" />
      {/* 값 */}
      <div className="h-5 w-16 bg-light-gray-20 rounded mx-auto" />
    </motion.div>
  );
}
