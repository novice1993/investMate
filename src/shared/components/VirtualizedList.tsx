import { useRef } from "react";
import { useVirtualizer } from "../hooks/useVirtualizer";

/**
 * VirtualizedList 컴포넌트의 props 타입을 정의합니다.
 * Generic 타입 T를 사용하여 어떤 종류의 아이템 배열이든 받을 수 있도록 합니다.
 */
interface VirtualizedListProps<T> {
  /** 렌더링할 전체 아이템 배열 */
  items: T[];
  /** 각 아이템의 고정 높이 (px) */
  itemHeight: number;
  /** 스크롤 컨테이너의 높이 (px) */
  containerHeight: number;
  /** 뷰포트 위아래로 추가 렌더링할 아이템 개수 */
  overscanCount?: number;
  /**
   * 각 아이템을 렌더링하는 함수입니다.
   * 부모 컴포넌트에서 이 함수를 주입하여 아이템의 렌더링 방식을 결정합니다.
   * @param item 렌더링할 개별 아이템
   * @returns React.ReactNode
   */
  renderItem: (item: T) => React.ReactNode;
}

/**
 * 대용량 리스트를 효율적으로 렌더링하기 위한 재사용 가능한 가상화 리스트 컴포넌트입니다.
 */
export function VirtualizedList<T>({ items, itemHeight, containerHeight, overscanCount, renderItem }: VirtualizedListProps<T>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { totalHeight, virtualItems } = useVirtualizer({
    itemCount: items.length,
    itemHeight,
    containerHeight,
    overscanCount,
    scrollContainerRef,
  });

  return (
    <div ref={scrollContainerRef} style={{ height: containerHeight, overflowY: "scroll" }} className="border rounded-md bg-gray-50">
      <div style={{ height: `${totalHeight}px`, position: "relative" }}>
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];
          if (!item) return null;

          return (
            <div
              key={virtualItem.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${itemHeight}px`,
                transform: `translateY(${virtualItem.offsetTop}px)`,
              }}
            >
              {renderItem(item)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
