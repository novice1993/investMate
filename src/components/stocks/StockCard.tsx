interface SecurityData {
  name?: string;
  symbol?: string;
  code?: string;
  price?: number;
  currentPrice?: number;
  changePercent?: number;
  volume?: number;
  marketCap?: number;
}

interface Props {
  security: SecurityData;
  onClick?: () => void;
  isSelected?: boolean;
  className?: string;
}

export function StockCard({ security, onClick, isSelected, className = "" }: Props) {
  const price = security.currentPrice ?? security.price ?? 0;
  const changePercent = security.changePercent ?? 0;
  const isUp = changePercent > 0;
  const isDown = changePercent < 0;

  const formattedPrice = new Intl.NumberFormat("ko-KR").format(price);
  const formattedChangePercent = `${changePercent > 0 ? "+" : ""}${changePercent.toFixed(2)}%`;

  const changeSymbol = isUp ? "▲" : isDown ? "▼" : "-";

  return (
    <div
      className={`w-80 bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden ${onClick ? "cursor-pointer" : ""} ${isSelected ? "ring-2 ring-blue-500" : ""} ${className}`}
      onClick={onClick}
    >
      {/* 상단 컬러 스트라이프 */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${isUp ? "bg-red-500" : isDown ? "bg-blue-500" : "bg-gray-300"}`}></div>

      {/* 헤더 섹션 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight">{security.name || "종목명"}</h3>
          <p className="text-sm text-gray-600 font-medium">{security.code || security.symbol || "코드"}</p>
        </div>
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
      </div>

      {/* 가격 정보 섹션 */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="text-center mb-3">
          <p className="text-2xl font-bold text-gray-900 mb-1">{formattedPrice}</p>
          <p className="text-xs text-gray-500 font-medium">원</p>
        </div>

        <div
          className={`flex items-center justify-center px-3 py-2 rounded-full border font-bold text-sm transition-all duration-200 ${isUp ? "bg-red-50 text-red-700 border-red-200" : isDown ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-700 border-gray-200"}`}
        >
          <span className="mr-2">{changeSymbol}</span>
          <span>{formattedChangePercent}</span>
        </div>
      </div>

      {/* 하단 정보 바 */}
      <div className="flex justify-between items-center bg-gradient-to-r from-gray-100 to-gray-50 rounded-lg px-3 py-2 text-xs">
        <span className="text-gray-700 font-medium">🔥 실시간</span>
        <span className="flex items-center text-green-600 font-bold">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-ping"></div>⚡ LIVE
        </span>
      </div>
    </div>
  );
}
