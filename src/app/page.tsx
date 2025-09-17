import Link from "next/link";

export default function Home() {
  const features = [
    {
      icon: "📊",
      title: "시장 전체보기",
      description: "KOSPI 전체 종목의 실시간 현황을 가상화 리스트로 빠르게 확인",
      href: "/market",
      color: "blue",
    },
    {
      icon: "🔍",
      title: "종목 스크리너",
      description: "ROE, RSI 등 재무·기술 지표로 유망 종목을 체계적으로 발굴",
      href: "/screener",
      color: "green",
    },
    {
      icon: "⚡",
      title: "실시간 트래커",
      description: "관심 종목의 실시간 변동을 모니터링하고 투자 타이밍 포착",
      href: "/tracker",
      color: "red",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          <span className="text-blue-600">invest</span>Mate
        </h1>
        <p className="text-xl text-gray-600 mb-2">개인 투자자를 위한 종합 도구</p>
        <p className="text-lg text-gray-500">어제의 분석, 오늘의 결정</p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        {features.map((feature) => (
          <Link key={feature.href} href={feature.href} className="group block p-6 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200">
            <div className="text-4xl mb-4">{feature.icon}</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600">{feature.title}</h3>
            <p className="text-gray-600 leading-relaxed">{feature.description}</p>
          </Link>
        ))}
      </div>

      {/* User Journey */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">투자 여정</h2>
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-blue-600 font-bold">1</span>
            </div>
            <p className="font-semibold text-gray-900">발굴</p>
            <p className="text-sm text-gray-600">스크리너에서 종목 탐색</p>
          </div>
          <div className="hidden md:block text-2xl text-gray-400">→</div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-green-600 font-bold">2</span>
            </div>
            <p className="font-semibold text-gray-900">확인</p>
            <p className="text-sm text-gray-600">실시간 정보 미리보기</p>
          </div>
          <div className="hidden md:block text-2xl text-gray-400">→</div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-purple-600 font-bold">3</span>
            </div>
            <p className="font-semibold text-gray-900">편입</p>
            <p className="text-sm text-gray-600">관심 종목에 추가</p>
          </div>
          <div className="hidden md:block text-2xl text-gray-400">→</div>
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-red-600 font-bold">4</span>
            </div>
            <p className="font-semibold text-gray-900">감시</p>
            <p className="text-sm text-gray-600">실시간 모니터링</p>
          </div>
        </div>
      </div>
    </div>
  );
}
