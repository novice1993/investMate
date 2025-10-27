"use client";

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
}

export function StockDetailView({ security }: Props) {
  if (!security) {
    return (
      <div className="h-full bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">종목 상세 정보</h2>

        <div className="space-y-6">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-lg font-medium">종목을 선택해주세요</p>
            <p className="text-sm">상세 정보를 확인할 수 있습니다</p>
          </div>
        </div>
      </div>
    );
  }

  const price = security.currentPrice || security.price || 0;
  const changePercent = security.changePercent || 0;
  const isUp = changePercent > 0;
  const isDown = changePercent < 0;

  return (
    <div className="h-full bg-white rounded-lg border border-gray-200 p-6">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{security.name}</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{security.code || security.symbol}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-3">
              <span className="text-2xl font-bold">{price.toLocaleString()} 원</span>
            </div>
            <div className="flex items-center justify-end mt-1">
              <span className={`text-lg font-semibold ${isUp ? "text-red-600" : isDown ? "text-blue-600" : "text-gray-600"}`}>
                {changePercent > 0 ? "+" : ""}
                {changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* 주요 지표 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">주요 지표</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">거래량</p>
              <span className="text-gray-900 font-medium">{security.volume?.toLocaleString() || "N/A"}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">시가총액</p>
              <span className="text-gray-900 font-medium">{security.marketCap?.toLocaleString() || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* 차트 영역 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">차트</h3>
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <div className="text-4xl mb-2">📈</div>
            <p className="text-gray-600">차트 영역</p>
            <p className="text-sm text-gray-500 mt-1">실시간 차트가 표시됩니다</p>
          </div>
        </div>

        {/* 뉴스 영역 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">관련 뉴스</h3>
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <div className="text-4xl mb-2">📰</div>
            <p className="text-gray-600">관련 뉴스</p>
            <p className="text-sm text-gray-500 mt-1">종목 관련 뉴스가 표시됩니다</p>
          </div>
        </div>

        {/* 재무 정보 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">재무 정보</h3>
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <div className="text-4xl mb-2">💼</div>
            <p className="text-gray-600">재무 정보</p>
            <p className="text-sm text-gray-500 mt-1">재무제표 데이터가 표시됩니다</p>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex space-x-3 pt-4">
          <button className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">관심종목 추가</button>
          <button className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors">상세 분석</button>
        </div>
      </div>
    </div>
  );
}
