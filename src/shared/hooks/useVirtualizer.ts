import { useState, useEffect, useMemo } from "react";

/**
 * 가상화 훅의 옵션 타입을 정의합니다.
 */
interface UseVirtualizerOptions {
  /** 전체 아이템의 개수 */
  itemCount: number;
  /** 각 아이템의 고정 높이 (px) */
  itemHeight: number;
  /** 스크롤이 일어나는 컨테이너의 높이 (px) */
  containerHeight: number;
  /** 뷰포트 위아래로 추가 렌더링할 아이템 개수 (스크롤 성능 향상) */
  overscanCount?: number;
  /** 스크롤 컨테이너의 DOM 엘리먼트에 대한 Ref 객체. React.RefObject<HTMLElement> 타입은 .current가 HTMLElement | null 임을 의미합니다. */
  scrollContainerRef: React.RefObject<HTMLElement | null>;
}

/**
 * 대용량 리스트 렌더링 최적화를 위한 가상화(Virtualization) 로직을 제공하는 커스텀 훅입니다.
 * 고정된 높이의 아이템을 가진 리스트에 사용됩니다.
 * @param options 가상화에 필요한 옵션 객체
 * @returns `{ totalHeight, virtualItems }` 렌더링에 필요한 가상화 정보
 */
export function useVirtualizer({
  itemCount,
  itemHeight,
  containerHeight,
  overscanCount = 5, // 기본값 5
  scrollContainerRef,
}: UseVirtualizerOptions) {
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    // 1. ref의 .current 속성이 null일 수 있음을 명시적으로 변수에 할당합니다.
    const container = scrollContainerRef.current;

    // 2. ref.current가 null일 경우(DOM이 아직 마운트되지 않았을 경우) effect가 실행되지 않도록 방어합니다.
    if (!container) {
      return;
    }

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };

    // 3. ref.current 값이 변경되었을 때(null -> HTMLElement) effect를 다시 실행하여 리스너를 등록합니다.
  }, [scrollContainerRef.current]);

  const { totalHeight, virtualItems } = useMemo(() => {
    const totalHeight = itemCount * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscanCount);
    const endIndex = Math.min(itemCount - 1, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscanCount);

    const items = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        offsetTop: i * itemHeight,
      });
    }

    return { totalHeight, virtualItems: items };
  }, [itemCount, itemHeight, containerHeight, scrollTop, overscanCount]);

  return {
    totalHeight,
    virtualItems,
  };
}
