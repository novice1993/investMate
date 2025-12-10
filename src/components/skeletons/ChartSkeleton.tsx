"use client";

import { motion } from "motion/react";

// ============================================================================
// Component
// ============================================================================

/**
 * 주가 차트 스켈레톤
 * - 캔들스틱 + 거래량 바 형태 모방
 * - 펄스 애니메이션 적용
 */
export function ChartSkeleton() {
  return (
    <div className="h-full flex flex-col p-3 bg-light-gray-5 rounded-lg">
      {/* 캔들스틱 영역 (상단 70%) */}
      <div className="flex-[7] flex items-end justify-between gap-1 pb-2 border-b border-light-gray-10">
        {Array.from({ length: 20 }).map((_, i) => (
          <CandleSkeleton key={i} index={i} />
        ))}
      </div>

      {/* 거래량 영역 (하단 30%) */}
      <div className="flex-[3] flex items-end justify-between gap-1 pt-2">
        {Array.from({ length: 20 }).map((_, i) => (
          <VolumeSkeleton key={i} index={i} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Sub Components
// ============================================================================

function CandleSkeleton({ index }: { index: number }) {
  // 랜덤 높이 시뮬레이션 (seed로 일관성 유지)
  const height = 30 + ((index * 7) % 50);
  const wickHeight = 10 + ((index * 3) % 20);

  return (
    <motion.div
      className="flex-1 flex flex-col items-center justify-end"
      initial={{ opacity: 0.4 }}
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        delay: index * 0.05,
      }}
    >
      {/* 위꼬리 */}
      <div className="w-px bg-light-gray-20" style={{ height: `${wickHeight}%` }} />
      {/* 몸통 */}
      <div className="w-full bg-light-gray-20 rounded-sm" style={{ height: `${height}%`, minHeight: 8 }} />
      {/* 아래꼬리 */}
      <div className="w-px bg-light-gray-20" style={{ height: `${wickHeight * 0.7}%` }} />
    </motion.div>
  );
}

function VolumeSkeleton({ index }: { index: number }) {
  const height = 20 + ((index * 11) % 60);

  return (
    <motion.div
      className="flex-1 bg-light-gray-20 rounded-t-sm"
      style={{ height: `${height}%` }}
      initial={{ opacity: 0.3 }}
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        delay: index * 0.05,
      }}
    />
  );
}
