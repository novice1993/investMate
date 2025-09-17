export default function ScreenerPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">종목 스크리너</h1>
        <p className="text-gray-600">
          <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full mr-2">📅 데이터 기준일: 어제</span>
          재무 지표와 기술적 분석으로 유망 종목을 발굴하세요
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* Filter: 필터 사이드바 */}
        <div className="col-span-3 bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">필터 조건</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ROE (%)</label>
              <div className="flex space-x-2">
                <input type="number" placeholder="최소" className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" />
                <input type="number" placeholder="최대" className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">RSI</label>
              <div className="flex space-x-2">
                <input type="number" placeholder="최소" className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" />
                <input type="number" placeholder="최대" className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">시가총액</label>
              <select className="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                <option value="">전체</option>
                <option value="large">대형주</option>
                <option value="mid">중형주</option>
                <option value="small">소형주</option>
              </select>
            </div>

            <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors">필터 적용</button>
          </div>
        </div>

        {/* Master: 필터링된 종목 테이블 */}
        <div className="col-span-5 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">필터링 결과</h2>
            <span className="text-sm text-gray-500">조건에 맞는 종목 검색 중...</span>
          </div>

          <div className="overflow-hidden">
            <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
              정렬 가능한 데이터 테이블이 여기에 표시됩니다
              <br />
              (ROE, PER, RSI 등 컬럼별 정렬 지원)
            </div>
          </div>
        </div>

        {/* Detail: 종목 상세 정보 */}
        <div className="col-span-4 bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">종목 상세</h2>

          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">📊 실시간 정보 확인</h3>
              <p className="text-green-700 text-sm mb-3">종목을 선택하면 실시간 가격과 차트를 확인할 수 있습니다.</p>
              <button className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition-colors text-sm">트래커에 추가</button>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">종목 선택 시 차트와 재무 정보가 표시됩니다</div>
          </div>
        </div>
      </div>
    </div>
  );
}
