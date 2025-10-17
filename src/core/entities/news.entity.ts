export interface News {
  id: string; // 고유 식별자
  title: string; // 기사 제목
  summary: string; // 기사 요약
  url: string; // 원문 링크
  publishedAt: Date; // 발행일시
  source: string; // 데이터 소스
  author?: string; // 기자명
}

/**
 * 데이터베이스 저장용 뉴스 기사 엔티티
 * Supabase news_articles 테이블과 매핑됨
 */
export interface NewsArticle {
  id?: string;
  title: string;
  url: string;
  summary: string;
  section: string;
  source: string;
  published_at: string; // ISO 8601 format
  created_at?: string;
}
