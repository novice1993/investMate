import { Security } from "@/core/entities/security.entity";

interface Props {
  stock: Partial<Security>;
  onClick?: () => void;
  className?: string;
}

export function StockCard({ stock, onClick, className = "" }: Props) {
  const price = stock.price ?? 0;
  const changePercent = stock.changePercent ?? 0;
  const isUp = changePercent > 0;
  const isDown = changePercent < 0;

  const formattedPrice = new Intl.NumberFormat("ko-KR").format(price);
  const formattedChangePercent = `${changePercent > 0 ? "+" : ""}${changePercent.toFixed(2)}%`;

  // KRDS 토큰을 활용한 조건부 클래스
  const changeColorClass = isUp
    ? "bg-light-danger-50 text-light-danger-70 border-light-danger-20"
    : isDown
      ? "bg-light-primary-50 text-light-primary-70 border-light-primary-20"
      : "bg-light-gray-10 text-light-gray-70 border-light-gray-20";

  const changeSymbol = isUp ? "▲" : isDown ? "▼" : "-";

  return (
    <div
      className={`w-80 bg-light-gray-0 rounded-2xl shadow-lg border border-light-gray-20 p-6 m-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
    >
      {/* 상단 컬러 스트라이프 */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-light-primary-50 to-light-success-50"></div>

      {/* 헤더 섹션 */}
      <div className="flex items-start justify-between mb-6">
        <div className="bg-light-gray-5 rounded-xl p-4 flex-1 mr-3">
          <h3 className="text-xl font-bold text-light-gray-90 mb-2 leading-tight">{stock.name}</h3>
          <p className="text-sm text-light-gray-60 font-semibold">{stock.symbol}</p>
        </div>
        <div className="w-4 h-4 bg-light-success-50 rounded-full animate-pulse shadow-lg"></div>
      </div>

      {/* 가격 정보 섹션 */}
      <div className="bg-light-gray-5 rounded-xl p-5 mb-5">
        <div className="text-center mb-4">
          <p className="text-3xl font-black text-light-gray-90 mb-1">{formattedPrice}</p>
          <p className="text-sm text-light-gray-50 font-semibold">원</p>
        </div>

        <div className={`flex items-center justify-center px-4 py-3 rounded-full border-2 font-bold text-sm transition-all duration-200 hover:scale-105 ${changeColorClass}`}>
          <span className="mr-2 text-base">{changeSymbol}</span>
          <span>{formattedChangePercent}</span>
        </div>
      </div>

      {/* 하단 정보 바 */}
      <div className="flex justify-between items-center bg-gradient-to-r from-light-gray-10 to-light-gray-5 rounded-lg px-4 py-3 text-sm">
        <span className="text-light-gray-70 font-semibold">🔥 실시간</span>
        <span className="flex items-center text-light-success-60 font-bold">
          <div className="w-2 h-2 bg-light-success-50 rounded-full mr-2 animate-ping"></div>⚡ LIVE
        </span>
      </div>
    </div>
  );
}
