import { useVirtualizer as useTanstackVirtualizer } from "@tanstack/react-virtual";
import { RefObject } from "react";

/**
 * 가상화 훅의 옵션 타입을 정의합니다.
 */
interface UseVirtualizerOptions {
  /** 전체 아이템의 개수 */
  itemCount: number;
  /** 각 아이템의 예상 높이 (px) - 실제 높이는 동적으로 측정됨 */
  estimateSize: number;
  /** 스크롤 컨테이너의 DOM 엘리먼트에 대한 Ref 객체 */
  scrollContainerRef: RefObject<HTMLElement | null>;
  /** 뷰포트 위아래로 추가 렌더링할 아이템 개수 (기본값: 5) */
  overscanCount?: number;
}

/**
 * 가상화(Virtualization) 로직을 제공하는 커스텀 훅입니다.
 * @tanstack/react-virtual을 래핑하여 프로젝트에 맞는 인터페이스를 제공합니다.
 *
 * @param options 가상화에 필요한 옵션 객체
 * @returns `{ virtualItems, totalSize, measureElement }` 렌더링에 필요한 가상화 정보
 */
export function useVirtualizer({ itemCount, estimateSize, scrollContainerRef, overscanCount = 5 }: UseVirtualizerOptions) {
  const virtualizer = useTanstackVirtualizer({
    count: itemCount,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => estimateSize,
    overscan: overscanCount,
  });

  return {
    virtualItems: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
    measureElement: virtualizer.measureElement,
  };
}
