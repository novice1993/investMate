"use client";

import { Security } from "@/core/entities/security.entity";

interface Props {
  stock: Partial<Security> | null;
}

export function StockDetailView({ stock }: Props) {
  if (!stock) {
    return (
      <div className="h-full bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">종목 상세 정보</h2>

        <div className="space-y-6">
          {/* 종목 선택 안내 */}
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">종목을 선택해주세요</h3>
            <p className="text-gray-600">
              왼쪽 목록에서 종목을 클릭하면
              <br />
              상세 정보와 차트를 확인할 수 있습니다.
            </p>
          </div>

          {/* 오늘의 주요 뉴스 */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3">📈 오늘의 주요 뉴스</h3>
            <div className="space-y-2 text-sm text-blue-700">
              <p>• 코스피, 외국인 매수세에 상승 출발</p>
              <p>• 반도체 업종 강세 지속</p>
              <p>• 달러 강세로 수출주 관심 증가</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formattedPrice = new Intl.NumberFormat("ko-KR").format(stock.price ?? 0);
  const changePercent = stock.changePercent ?? 0;
  const isUp = changePercent > 0;
  const isDown = changePercent < 0;

  return (
    <div className="h-full bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{stock.name}</h2>
          <p className="text-gray-600">{stock.symbol}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{formattedPrice}원</p>
          <p className={`text-lg font-semibold ${isUp ? "text-red-600" : isDown ? "text-blue-600" : "text-gray-600"}`}>
            {changePercent > 0 ? "+" : ""}
            {changePercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        <button className="flex-1 py-2 px-4 bg-white rounded-md text-sm font-medium text-gray-900 shadow-sm">차트</button>
        <button className="flex-1 py-2 px-4 text-sm font-medium text-gray-600 hover:text-gray-900">뉴스</button>
        <button className="flex-1 py-2 px-4 text-sm font-medium text-gray-600 hover:text-gray-900">재무정보</button>
      </div>

      {/* 차트 영역 */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6 h-64 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📈</div>
          <p>차트가 여기에 표시됩니다</p>
          <p className="text-sm">(react-echarts 연동 예정)</p>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">시장 정보</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">시장:</span>
              <span className="font-medium">{stock.market || "KOSPI"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">통화:</span>
              <span className="font-medium">{stock.currency || "KRW"}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">거래 정보</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">거래량:</span>
              <span className="font-medium">{stock.volume ? new Intl.NumberFormat("ko-KR").format(stock.volume) : "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">전일종가:</span>
              <span className="font-medium">{stock.previousClose ? new Intl.NumberFormat("ko-KR").format(stock.previousClose) : "-"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex space-x-3">
          <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">관심종목 추가</button>
          <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">실시간 정보 보기</button>
        </div>
      </div>
    </div>
  );
}
