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
  paper_date?: string; // 신문 게재일 (YYYY-MM-DD 형식)
  created_at?: string;
}
