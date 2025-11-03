import { NewsArticle } from "@/core/entities/news.entity";
import { getSupabaseClient } from "@/core/infrastructure/common/supabase.infra";

/**
 * 뉴스 기사를 데이터베이스에 저장합니다.
 */
export async function insertNewsArticle(article: NewsArticle) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("news_articles").insert(article).select().single();

  if (error) {
    console.error("[News Repository] 기사 저장 오류:", error);
    throw error;
  }

  return data;
}

/**
 * 여러 뉴스 기사를 한 번에 저장합니다.
 */
export async function insertNewsArticles(articles: NewsArticle[]) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("news_articles").insert(articles).select();

  if (error) {
    console.error("[News Repository] 기사 일괄 저장 오류:", error);
    throw error;
  }

  return data;
}

/**
 * URL로 뉴스 기사가 이미 존재하는지 확인합니다.
 */
export async function checkArticleExists(url: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("news_articles").select("id").eq("url", url).maybeSingle();

  if (error) {
    console.error("[News Repository] 기사 존재 확인 오류:", error);
    throw error;
  }

  return data !== null;
}

/**
 * 모든 뉴스 기사를 조회합니다.
 */
export async function fetchNewsArticles(limit: number = 100, section?: string) {
  const supabase = getSupabaseClient();
  let query = supabase.from("news_articles").select("*").order("published_at", { ascending: false }).limit(limit);

  if (section) {
    query = query.eq("section", section);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[News Repository] 기사 조회 오류:", error);
    throw error;
  }

  return data;
}

/**
 * 최신 뉴스 기사 1개를 조회합니다.
 */
export async function fetchLatestNewsArticle() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("news_articles").select("*").order("published_at", { ascending: false }).limit(1).maybeSingle();

  if (error) {
    console.error("[News Repository] 최신 기사 조회 오류:", error);
    throw error;
  }

  return data;
}
