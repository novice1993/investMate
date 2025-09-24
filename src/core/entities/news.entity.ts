export interface News {
  id: string; // 고유 식별자
  title: string; // 기사 제목
  summary: string; // 기사 요약
  url: string; // 원문 링크
  publishedAt: Date; // 발행일시
  source: string; // 데이터 소스
  author?: string; // 기자명
}
