import { useRef } from "react";
import { useVirtualizer } from "../hooks/useVirtualizer";

/**
 * VirtualizedList 컴포넌트의 props 타입을 정의합니다.
 * Generic 타입 T를 사용하여 어떤 종류의 아이템 배열이든 받을 수 있도록 합니다.
 */
interface VirtualizedListProps<T> {
  /** 렌더링할 전체 아이템 배열 */
  items: T[];
  /** 각 아이템의 예상 높이 (px) - 실제 높이는 동적으로 측정됨 */
  estimateSize: number;
  /** 스크롤 컨테이너의 높이 (px) */
  containerHeight: number;
  /** 뷰포트 위아래로 추가 렌더링할 아이템 개수 */
  overscanCount?: number;
  /**
   * 각 아이템을 렌더링하는 함수입니다.
   * 부모 컴포넌트에서 이 함수를 주입하여 아이템의 렌더링 방식을 결정합니다.
   * @param item 렌더링할 개별 아이템
   * @param measureElement 아이템 높이 측정을 위한 ref 함수
   * @returns React.ReactNode
   */
  renderItem: (item: T, measureElement: (node: Element | null) => void) => React.ReactNode;
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * 대용량 리스트를 효율적으로 렌더링하기 위한 재사용 가능한 가상화 리스트 컴포넌트입니다.
 * @tanstack/react-virtual을 활용하여 최적화된 렌더링을 제공합니다.
 */
export function VirtualizedList<T>({ items, estimateSize, containerHeight, overscanCount, renderItem, className = "" }: VirtualizedListProps<T>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { virtualItems, totalSize, measureElement } = useVirtualizer({
    itemCount: items.length,
    estimateSize,
    scrollContainerRef,
    overscanCount,
  });

  return (
    <div ref={scrollContainerRef} style={{ height: containerHeight, overflowY: "auto" }} className={`${className}`}>
      <div style={{ height: `${totalSize}px`, position: "relative" }}>
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];
          if (!item) return null;

          return (
            <div
              key={virtualItem.index}
              data-index={virtualItem.index}
              ref={measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderItem(item, measureElement)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
