"use client";

export default function MonitoringPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-light-gray-90 mb-2">모니터링</h1>
        <p className="text-light-gray-50">조건 기반 시그널 자동 감시</p>
      </div>

      <div className="bg-light-gray-0 rounded-lg border border-light-gray-20 p-8">
        <div className="text-center text-light-gray-40">
          <p className="text-lg mb-2">구현 예정</p>
          <p className="text-sm">RSI, 연속 상승/하락, 조건 기반 알림 기능이 추가될 예정입니다.</p>
        </div>
      </div>
    </div>
  );
}
