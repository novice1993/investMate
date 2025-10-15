import { getSupabaseClient } from "./supabase.infra";

/**
 * @fileoverview 뉴스 기사 데이터베이스 인프라 레이어
 * Supabase를 통한 뉴스 기사 CRUD 작업을 담당합니다.
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

/**
 * 뉴스 기사를 데이터베이스에 저장합니다.
 * @param article 저장할 뉴스 기사 데이터
 * @returns 저장된 기사 데이터
 */
export async function insertNewsArticle(article: NewsArticle) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("news_articles").insert(article).select().single();

  if (error) {
    console.error("[News DB] Error inserting article:", error);
    throw error;
  }

  return data;
}

/**
 * 여러 뉴스 기사를 한 번에 저장합니다.
 * @param articles 저장할 뉴스 기사 배열
 * @returns 저장된 기사 데이터 배열
 */
export async function insertNewsArticles(articles: NewsArticle[]) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("news_articles").insert(articles).select();

  if (error) {
    console.error("[News DB] Error inserting articles:", error);
    throw error;
  }

  return data;
}

/**
 * URL로 뉴스 기사가 이미 존재하는지 확인합니다.
 * @param url 확인할 기사 URL
 * @returns 존재 여부
 */
export async function checkArticleExists(url: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("news_articles").select("id").eq("url", url).maybeSingle();

  if (error) {
    console.error("[News DB] Error checking article existence:", error);
    throw error;
  }

  return data !== null;
}

/**
 * 모든 뉴스 기사를 조회합니다.
 * @param limit 조회할 기사 수 (기본: 100)
 * @param section 섹션 필터 (선택)
 * @returns 뉴스 기사 배열
 */
export async function fetchNewsArticles(limit: number = 100, section?: string) {
  const supabase = getSupabaseClient();
  let query = supabase.from("news_articles").select("*").order("published_at", { ascending: false }).limit(limit);

  if (section) {
    query = query.eq("section", section);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[News DB] Error fetching articles:", error);
    throw error;
  }

  return data;
}

/**
 * 최신 뉴스 기사 1개를 조회합니다.
 * @returns 최신 뉴스 기사 또는 null
 */
export async function fetchLatestNewsArticle() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("news_articles").select("*").order("published_at", { ascending: false }).limit(1).maybeSingle();

  if (error) {
    console.error("[News DB] Error fetching latest article:", error);
    throw error;
  }

  return data;
}
