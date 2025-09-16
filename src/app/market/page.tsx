export default function MarketPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">시장 전체보기</h1>
        <p className="text-gray-600">KOSPI 전체 종목의 실시간 현황을 한눈에 확인하세요</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
        {/* Master: 종목 리스트 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">KOSPI 종목</h2>
            <span className="text-sm text-gray-500">총 960+ 종목</span>
          </div>

          <div className="space-y-2">
            {/* 기존 krx-test 컴포넌트가 여기에 들어갈 예정 */}
            <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
              종목 리스트가 여기에 표시됩니다
              <br />
              (krx-test 컴포넌트 이전 예정)
            </div>
          </div>
        </div>

        {/* Detail: 상세 정보 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">상세 정보</h2>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">📈 오늘의 주요 뉴스</h3>
              <p className="text-blue-700 text-sm">종목을 선택하면 해당 종목의 차트와 뉴스를 확인할 수 있습니다.</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">종목 선택 시 차트와 뉴스가 표시됩니다</div>
          </div>
        </div>
      </div>
    </div>
  );
}
