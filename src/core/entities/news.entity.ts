/**
 * 뉴스 기사 엔티티
 * Supabase news 테이블과 매핑됨
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
