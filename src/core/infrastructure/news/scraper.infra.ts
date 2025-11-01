import { textHttpClient } from "@/shared/lib/http";

/**
 * 주어진 URL의 HTML 컨텐츠를 문자열로 가져옵니다.
 * @param url 스크래핑할 페이지의 URL
 * @returns HTML 컨텐츠 문자열
 */
export async function fetchArticleHtml(url: string): Promise<string> {
  try {
    const htmlContent = await textHttpClient.get<string>(url);
    return htmlContent;
  } catch (error) {
    console.error(`[fetchArticleHtml] Failed to fetch HTML from URL: ${url}`, error);
    throw new Error(`Failed to fetch HTML from ${url}`);
  }
}
