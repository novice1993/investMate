export default function TrackerPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">실시간 트래커</h1>
        <p className="text-gray-600">
          <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-sm rounded-full mr-2">⚡ LIVE</span>
          관심 종목의 실시간 동향을 모니터링하고 투자 타이밍을 포착하세요
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
        {/* Master: 실시간 관심 종목 카드 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">관심 종목</h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600 font-medium">실시간 연결됨</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* 빈 상태 */}
            <div className="p-6 bg-blue-50 rounded-lg text-center">
              <div className="text-4xl mb-2">📈</div>
              <h3 className="font-semibold text-blue-900 mb-2">관심 종목을 추가해보세요</h3>
              <p className="text-blue-700 text-sm mb-4">종목 스크리너에서 유망한 종목을 발굴하고 트래커에 추가하여 실시간으로 모니터링할 수 있습니다.</p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm">스크리너로 이동</button>
            </div>

            {/* 실시간 카드들이 여기에 표시될 예정 */}
            <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
              실시간 종목 카드들이 여기에 표시됩니다
              <br />
              (가격 변동 애니메이션, RSI 게이지 등)
            </div>
          </div>
        </div>

        {/* Detail: 선택된 종목 상세 정보 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">실시간 상세 정보</h2>

          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg">
              <h3 className="font-semibold text-red-900 mb-2">🔔 실시간 알림</h3>
              <p className="text-red-700 text-sm">RSI 과매수/과매도 구간 진입 시 시각적 알림을 제공합니다.</p>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-2">📊 실시간 차트</h3>
              <p className="text-yellow-700 text-sm">선택한 종목의 실시간 가격 변동을 차트로 확인할 수 있습니다.</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">종목 선택 시 실시간 차트와 지표가 표시됩니다</div>
          </div>
        </div>
      </div>
    </div>
  );
}
